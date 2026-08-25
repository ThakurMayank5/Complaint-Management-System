package staff

import (
	"errors"
	"strconv"

	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type updateComplaintStatusRequest struct {
	Status models.Status `json:"status" binding:"required"`
}

func authenticatedStaffID(ctx *gin.Context) string {
	userId := ctx.GetString("uid")
	if userId == "" {
		userId = ctx.GetString("user_id")
	}
	return userId
}

func isValidComplaintStatus(status models.Status) bool {
	return status == models.StatusOpen ||
		status == models.StatusInProgress ||
		status == models.StatusClosed
}

func HandleGetActiveComplaints(ctx *gin.Context, pool *pgxpool.Pool) {

	staffId := authenticatedStaffID(ctx)

	if staffId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	query := `
		SELECT c.id, c.subject, c.description, c.category, c.department, c.location, c.priority, c.status, c.user_id
		FROM complaints c
		JOIN staff s ON c.id::text = ANY(s.queue)
		WHERE s.id = $1 AND (c.status = $2 OR c.status = $3)
		ORDER BY c.created_at DESC`
	rows, err := pool.Query(ctx, query, staffId, models.StatusOpen, models.StatusInProgress)

	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	defer rows.Close()

	var complaints []models.Complaint

	for rows.Next() {
		var complaint models.Complaint
		if err := rows.Scan(&complaint.ID, &complaint.Subject, &complaint.Description, &complaint.Category, &complaint.Department, &complaint.Location, &complaint.Priority, &complaint.Status, &complaint.UserID); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}

		complaints = append(complaints, complaint)
	}

	if err := rows.Err(); err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"complaints": complaints})

}

func HandleGetComplaintDetails(ctx *gin.Context, pool *pgxpool.Pool) {
	complaintIdParam := ctx.Param("id")
	complaintID, err := strconv.Atoi(complaintIdParam)

	if err != nil {
		ctx.JSON(400, gin.H{"error": "invalid complaint id"})
		return
	}

	staffId := authenticatedStaffID(ctx)
	if staffId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	query := `
		SELECT c.id, c.subject, c.description, c.category, c.department, c.location, c.priority, c.status, c.user_id
		FROM complaints c
		JOIN staff s ON c.id::text = ANY(s.queue)
		WHERE c.id = $1 AND s.id = $2`
	row := pool.QueryRow(ctx, query, complaintID, staffId)

	var complaint models.Complaint
	if err := row.Scan(&complaint.ID, &complaint.Subject, &complaint.Description, &complaint.Category, &complaint.Department, &complaint.Location, &complaint.Priority, &complaint.Status, &complaint.UserID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			ctx.JSON(404, gin.H{"error": "complaint not found"})
			return
		}
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"complaint": complaint})
}

func HandleUpdateComplaintStatus(ctx *gin.Context, pool *pgxpool.Pool) {
	complaintIdParam := ctx.Param("id")
	complaintID, err := strconv.Atoi(complaintIdParam)

	if err != nil {
		ctx.JSON(400, gin.H{"error": "invalid complaint id"})
		return
	}

	staffId := authenticatedStaffID(ctx)
	if staffId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	status := models.Status(ctx.Query("status"))
	if status == "" {
		var req updateComplaintStatusRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(400, gin.H{"error": "status parameter is required"})
			return
		}
		status = req.Status
	}

	if !isValidComplaintStatus(status) {
		ctx.JSON(400, gin.H{"error": "invalid complaint status"})
		return
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var previousStatus models.Status
	query := `
		SELECT c.status
		FROM complaints c
		JOIN staff s ON c.id::text = ANY(s.queue)
		WHERE c.id = $1 AND s.id = $2`
	err = tx.QueryRow(ctx, query, complaintID, staffId).Scan(&previousStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			ctx.JSON(404, gin.H{"error": "complaint not found"})
			return
		}
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	_, err = tx.Exec(ctx, `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, status, complaintID)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if status == models.StatusClosed {
		_, err = tx.Exec(ctx, `UPDATE staff SET queue = array_remove(queue, $1) WHERE id = $2`, strconv.Itoa(complaintID), staffId)
		if err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO complaint_history (complaint_id, previous_status, new_status, changed_by, changed_by_role)
		VALUES ($1, $2, $3, $4, $5)`, complaintID, previousStatus, status, staffId, "staff")
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"message": "complaint status updated successfully"})

}

// HandleGetProfile returns staff profile info with complaint counts.
func HandleGetProfile(ctx *gin.Context, pool *pgxpool.Pool) {
	staffId := authenticatedStaffID(ctx)
	if staffId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	var staff models.Staff
	err := pool.QueryRow(ctx,
		`SELECT id, first_name, last_name, email, department, queue FROM staff WHERE id = $1`,
		staffId,
	).Scan(&staff.ID, &staff.FirstName, &staff.LastName, &staff.Email, &staff.Department, &staff.Queue)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			ctx.JSON(404, gin.H{"error": "staff profile not found"})
			return
		}
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Complaint counts
	var openCount, inProgressCount, closedCount, totalCount int
	err = pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'open'),
			COUNT(*) FILTER (WHERE status = 'in_progress'),
			COUNT(*) FILTER (WHERE status = 'closed'),
			COUNT(*)
		FROM complaints WHERE assigned_staff_id = $1`, staffId).
		Scan(&openCount, &inProgressCount, &closedCount, &totalCount)
	if err != nil {
		openCount, inProgressCount, closedCount, totalCount = 0, 0, 0, 0
	}

	ctx.JSON(200, gin.H{
		"staff": staff,
		"stats": gin.H{
			"open":        openCount,
			"in_progress": inProgressCount,
			"closed":      closedCount,
			"total":       totalCount,
			"queue_size":  len(staff.Queue),
		},
	})
}

// HandleGetHistory returns complaint status change history for the current staff member.
func HandleGetHistory(ctx *gin.Context, pool *pgxpool.Pool) {
	staffId := authenticatedStaffID(ctx)
	if staffId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	rows, err := pool.Query(ctx, `
		SELECT h.id, h.complaint_id, COALESCE(h.previous_status, ''), h.new_status,
			   h.changed_by, h.changed_by_role, h.changed_at::text,
			   c.subject, c.department
		FROM complaint_history h
		JOIN complaints c ON c.id = h.complaint_id
		WHERE h.changed_by = $1
		ORDER BY h.changed_at DESC`, staffId)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type historyEntry struct {
		ID             int    `json:"id"`
		ComplaintID    int    `json:"complaint_id"`
		PreviousStatus string `json:"previous_status"`
		NewStatus      string `json:"new_status"`
		ChangedBy      string `json:"changed_by"`
		ChangedByRole  string `json:"changed_by_role"`
		ChangedAt      string `json:"changed_at"`
		Subject        string `json:"subject"`
		Department     string `json:"department"`
	}

	var history []historyEntry
	for rows.Next() {
		var h historyEntry
		if err := rows.Scan(&h.ID, &h.ComplaintID, &h.PreviousStatus, &h.NewStatus,
			&h.ChangedBy, &h.ChangedByRole, &h.ChangedAt, &h.Subject, &h.Department); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		history = append(history, h)
	}

	ctx.JSON(200, gin.H{"history": history})
}

// HandleGetAllComplaints returns all complaints assigned to the staff (including closed).
func HandleGetAllComplaints(ctx *gin.Context, pool *pgxpool.Pool) {
	staffId := authenticatedStaffID(ctx)
	if staffId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	rows, err := pool.Query(ctx, `
		SELECT c.id, c.subject, c.description, c.category, c.department,
			   c.location, c.priority, c.status, c.user_id
		FROM complaints c
		WHERE c.assigned_staff_id = $1
		ORDER BY c.created_at DESC`, staffId)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var complaints []models.Complaint
	for rows.Next() {
		var c models.Complaint
		if err := rows.Scan(&c.ID, &c.Subject, &c.Description, &c.Category,
			&c.Department, &c.Location, &c.Priority, &c.Status, &c.UserID); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		complaints = append(complaints, c)
	}

	ctx.JSON(200, gin.H{"complaints": complaints})
}

