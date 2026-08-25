package admin

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// authenticatedAdminID extracts the uid set by the auth middleware.
func authenticatedAdminID(ctx *gin.Context) string {
	uid := ctx.GetString("uid")
	if uid == "" {
		uid = ctx.GetString("user_id")
	}
	return uid
}

// ---------- Dashboard Stats ----------

type StatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type DepartmentCount struct {
	Department string `json:"department"`
	Count      int    `json:"count"`
}

type PriorityCount struct {
	Priority string `json:"priority"`
	Count    int    `json:"count"`
}

type DashboardStatsResponse struct {
	Total            int               `json:"total"`
	StatusCounts     []StatusCount     `json:"status_counts"`
	DepartmentCounts []DepartmentCount `json:"department_counts"`
	PriorityCounts   []PriorityCount   `json:"priority_counts"`
}

// HandleGetDashboardStats returns aggregate counts for the admin dashboard charts.
func HandleGetDashboardStats(ctx *gin.Context, pool *pgxpool.Pool) {
	var resp DashboardStatsResponse

	// Total complaints
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM complaints`).Scan(&resp.Total); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to count complaints: " + err.Error()})
		return
	}

	// Counts by status
	rows, err := pool.Query(ctx, `SELECT status, COUNT(*) FROM complaints GROUP BY status ORDER BY status`)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	for rows.Next() {
		var sc StatusCount
		if err := rows.Scan(&sc.Status, &sc.Count); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		resp.StatusCounts = append(resp.StatusCounts, sc)
	}

	// Counts by department
	rows2, err := pool.Query(ctx, `SELECT department, COUNT(*) FROM complaints GROUP BY department ORDER BY department`)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows2.Close()
	for rows2.Next() {
		var dc DepartmentCount
		if err := rows2.Scan(&dc.Department, &dc.Count); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		resp.DepartmentCounts = append(resp.DepartmentCounts, dc)
	}

	// Counts by priority
	rows3, err := pool.Query(ctx, `SELECT priority, COUNT(*) FROM complaints GROUP BY priority ORDER BY priority`)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows3.Close()
	for rows3.Next() {
		var pc PriorityCount
		if err := rows3.Scan(&pc.Priority, &pc.Count); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		resp.PriorityCounts = append(resp.PriorityCounts, pc)
	}

	ctx.JSON(200, resp)
}

// ---------- Staff Stats ----------

type StaffStatEntry struct {
	StaffID    string `json:"staff_id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Department string `json:"department"`
	Open       int    `json:"open"`
	InProgress int    `json:"in_progress"`
	Closed     int    `json:"closed"`
	Total      int    `json:"total"`
}

// HandleGetStaffStats returns per-staff complaint counts broken down by status.
func HandleGetStaffStats(ctx *gin.Context, pool *pgxpool.Pool) {
	query := `
		SELECT
			s.id, s.first_name, s.last_name, s.email, s.department,
			COUNT(*) FILTER (WHERE c.status = 'open') AS open_count,
			COUNT(*) FILTER (WHERE c.status = 'in_progress') AS in_progress_count,
			COUNT(*) FILTER (WHERE c.status = 'closed') AS closed_count,
			COUNT(c.id) AS total_count
		FROM staff s
		LEFT JOIN complaints c ON c.assigned_staff_id = s.id
		GROUP BY s.id, s.first_name, s.last_name, s.email, s.department
		ORDER BY total_count DESC, s.first_name`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var stats []StaffStatEntry
	for rows.Next() {
		var s StaffStatEntry
		if err := rows.Scan(&s.StaffID, &s.FirstName, &s.LastName, &s.Email, &s.Department,
			&s.Open, &s.InProgress, &s.Closed, &s.Total); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		stats = append(stats, s)
	}

	ctx.JSON(200, gin.H{"staff_stats": stats})
}

// ---------- Search Complaints ----------

type AdminComplaint struct {
	ID              int    `json:"id"`
	UserID          string `json:"user_id"`
	Subject         string `json:"subject"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	Department      string `json:"department"`
	Location        string `json:"location"`
	Priority        string `json:"priority"`
	Status          string `json:"status"`
	AssignedStaffID *string `json:"assigned_staff_id"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

type SearchResponse struct {
	Complaints []AdminComplaint `json:"complaints"`
	Total      int              `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"total_pages"`
}

// HandleSearchComplaints provides filtered, paginated complaint search for admins.
func HandleSearchComplaints(ctx *gin.Context, pool *pgxpool.Pool) {
	status := ctx.Query("status")
	department := ctx.Query("department")
	category := ctx.Query("category")
	priority := ctx.Query("priority")
	q := ctx.Query("q")
	fromDate := ctx.Query("from_date")
	toDate := ctx.Query("to_date")

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("c.status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}
	if department != "" {
		conditions = append(conditions, fmt.Sprintf("c.department = $%d", argIdx))
		args = append(args, department)
		argIdx++
	}
	if category != "" {
		conditions = append(conditions, fmt.Sprintf("c.category = $%d", argIdx))
		args = append(args, category)
		argIdx++
	}
	if priority != "" {
		conditions = append(conditions, fmt.Sprintf("c.priority = $%d", argIdx))
		args = append(args, priority)
		argIdx++
	}
	if q != "" {
		conditions = append(conditions, fmt.Sprintf("(c.subject ILIKE $%d OR c.description ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+q+"%")
		argIdx++
	}
	if fromDate != "" {
		conditions = append(conditions, fmt.Sprintf("c.created_at >= $%d", argIdx))
		args = append(args, fromDate)
		argIdx++
	}
	if toDate != "" {
		conditions = append(conditions, fmt.Sprintf("c.created_at <= ($%d::date + INTERVAL '1 day')", argIdx))
		args = append(args, toDate)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM complaints c %s", whereClause)
	var total int
	if err := pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	offset := (page - 1) * limit

	selectQuery := fmt.Sprintf(`
		SELECT c.id, c.user_id, c.subject, c.description, c.category, c.department,
			   c.location, c.priority, c.status, c.assigned_staff_id,
			   c.created_at::text, c.updated_at::text
		FROM complaints c
		%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := pool.Query(ctx, selectQuery, args...)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var complaints []AdminComplaint
	for rows.Next() {
		var ac AdminComplaint
		if err := rows.Scan(&ac.ID, &ac.UserID, &ac.Subject, &ac.Description,
			&ac.Category, &ac.Department, &ac.Location, &ac.Priority, &ac.Status,
			&ac.AssignedStaffID, &ac.CreatedAt, &ac.UpdatedAt); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		complaints = append(complaints, ac)
	}

	ctx.JSON(200, SearchResponse{
		Complaints: complaints,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// ---------- Get All Complaints (paginated, for recent list) ----------

// HandleGetAllComplaints returns paginated complaints for the admin overview.
func HandleGetAllComplaints(ctx *gin.Context, pool *pgxpool.Pool) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	rows, err := pool.Query(ctx, `
		SELECT c.id, c.user_id, c.subject, c.description, c.category, c.department,
			   c.location, c.priority, c.status, c.assigned_staff_id,
			   c.created_at::text, c.updated_at::text
		FROM complaints c
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var complaints []AdminComplaint
	for rows.Next() {
		var ac AdminComplaint
		if err := rows.Scan(&ac.ID, &ac.UserID, &ac.Subject, &ac.Description,
			&ac.Category, &ac.Department, &ac.Location, &ac.Priority, &ac.Status,
			&ac.AssignedStaffID, &ac.CreatedAt, &ac.UpdatedAt); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		complaints = append(complaints, ac)
	}

	ctx.JSON(200, gin.H{"complaints": complaints})
}

// ---------- Get Complaint Details ----------

type ComplaintHistoryEntry struct {
	ID             int    `json:"id"`
	PreviousStatus string `json:"previous_status"`
	NewStatus      string `json:"new_status"`
	ChangedBy      string `json:"changed_by"`
	ChangedByRole  string `json:"changed_by_role"`
	ChangedAt      string `json:"changed_at"`
}

type ComplaintDetailResponse struct {
	Complaint    AdminComplaint          `json:"complaint"`
	FiledByUser  *FiledByUser            `json:"filed_by_user"`
	AssignedStaff *AssignedStaffInfo     `json:"assigned_staff"`
	History      []ComplaintHistoryEntry  `json:"history"`
}

type FiledByUser struct {
	UID       string `json:"uid"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type AssignedStaffInfo struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Department string `json:"department"`
}

// HandleGetComplaintDetails returns the full complaint with user, staff, and history data.
func HandleGetComplaintDetails(ctx *gin.Context, pool *pgxpool.Pool) {
	complaintIDParam := ctx.Param("id")
	complaintID, err := strconv.Atoi(complaintIDParam)
	if err != nil {
		ctx.JSON(400, gin.H{"error": "invalid complaint id"})
		return
	}

	// Fetch complaint
	var ac AdminComplaint
	err = pool.QueryRow(ctx, `
		SELECT c.id, c.user_id, c.subject, c.description, c.category, c.department,
			   c.location, c.priority, c.status, c.assigned_staff_id,
			   c.created_at::text, c.updated_at::text
		FROM complaints c WHERE c.id = $1`, complaintID).Scan(
		&ac.ID, &ac.UserID, &ac.Subject, &ac.Description,
		&ac.Category, &ac.Department, &ac.Location, &ac.Priority, &ac.Status,
		&ac.AssignedStaffID, &ac.CreatedAt, &ac.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			ctx.JSON(404, gin.H{"error": "complaint not found"})
			return
		}
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	resp := ComplaintDetailResponse{Complaint: ac}

	// Fetch filing user info
	var fu FiledByUser
	err = pool.QueryRow(ctx, `SELECT uid, email, first_name, last_name FROM users WHERE uid = $1`, ac.UserID).
		Scan(&fu.UID, &fu.Email, &fu.FirstName, &fu.LastName)
	if err == nil {
		resp.FiledByUser = &fu
	}

	// Fetch assigned staff info
	if ac.AssignedStaffID != nil && *ac.AssignedStaffID != "" {
		var asi AssignedStaffInfo
		err = pool.QueryRow(ctx, `SELECT id, email, first_name, last_name, department FROM staff WHERE id = $1`, *ac.AssignedStaffID).
			Scan(&asi.ID, &asi.Email, &asi.FirstName, &asi.LastName, &asi.Department)
		if err == nil {
			resp.AssignedStaff = &asi
		}
	}

	// Fetch history
	histRows, err := pool.Query(ctx, `
		SELECT id, COALESCE(previous_status, ''), new_status, changed_by, changed_by_role, changed_at::text
		FROM complaint_history
		WHERE complaint_id = $1
		ORDER BY changed_at DESC`, complaintID)
	if err == nil {
		defer histRows.Close()
		for histRows.Next() {
			var h ComplaintHistoryEntry
			if err := histRows.Scan(&h.ID, &h.PreviousStatus, &h.NewStatus, &h.ChangedBy, &h.ChangedByRole, &h.ChangedAt); err != nil {
				continue
			}
			resp.History = append(resp.History, h)
		}
	}

	ctx.JSON(200, resp)
}

// ---------- Update Complaint Status ----------

type updateStatusRequest struct {
	Status models.Status `json:"status" binding:"required"`
}

// HandleUpdateComplaintStatus allows admins to change the status of any complaint.
func HandleUpdateComplaintStatus(ctx *gin.Context, pool *pgxpool.Pool) {
	complaintIDParam := ctx.Param("id")
	complaintID, err := strconv.Atoi(complaintIDParam)
	if err != nil {
		ctx.JSON(400, gin.H{"error": "invalid complaint id"})
		return
	}

	adminID := authenticatedAdminID(ctx)
	if adminID == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	var req updateStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": "status is required"})
		return
	}

	if req.Status != models.StatusOpen && req.Status != models.StatusInProgress && req.Status != models.StatusClosed {
		ctx.JSON(400, gin.H{"error": "invalid status value"})
		return
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	// Get current status
	var previousStatus models.Status
	err = tx.QueryRow(ctx, `SELECT status FROM complaints WHERE id = $1`, complaintID).Scan(&previousStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			ctx.JSON(404, gin.H{"error": "complaint not found"})
			return
		}
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Update status
	_, err = tx.Exec(ctx, `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, req.Status, complaintID)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// If closing, remove from staff queue
	if req.Status == models.StatusClosed {
		_, err = tx.Exec(ctx, `UPDATE staff SET queue = array_remove(queue, $1) WHERE $1 = ANY(queue)`, strconv.Itoa(complaintID))
		if err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	// Record in history
	_, err = tx.Exec(ctx, `
		INSERT INTO complaint_history (complaint_id, previous_status, new_status, changed_by, changed_by_role)
		VALUES ($1, $2, $3, $4, 'admin')`, complaintID, previousStatus, req.Status, adminID)
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

// ---------- List All Staff ----------

type StaffListEntry struct {
	ID         string `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Department string `json:"department"`
	QueueSize  int    `json:"queue_size"`
	Open       int    `json:"open"`
	InProgress int    `json:"in_progress"`
	Closed     int    `json:"closed"`
	Total      int    `json:"total"`
}

// HandleGetAllStaff returns all staff members with their complaint counts.
func HandleGetAllStaff(ctx *gin.Context, pool *pgxpool.Pool) {
	query := `
		SELECT
			s.id, s.first_name, s.last_name, s.email, s.department,
			COALESCE(array_length(s.queue, 1), 0) AS queue_size,
			COUNT(*) FILTER (WHERE c.status = 'open') AS open_count,
			COUNT(*) FILTER (WHERE c.status = 'in_progress') AS in_progress_count,
			COUNT(*) FILTER (WHERE c.status = 'closed') AS closed_count,
			COUNT(c.id) AS total_count
		FROM staff s
		LEFT JOIN complaints c ON c.assigned_staff_id = s.id
		GROUP BY s.id, s.first_name, s.last_name, s.email, s.department, s.queue
		ORDER BY s.department, s.first_name`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var staff []StaffListEntry
	for rows.Next() {
		var s StaffListEntry
		if err := rows.Scan(&s.ID, &s.FirstName, &s.LastName, &s.Email, &s.Department,
			&s.QueueSize, &s.Open, &s.InProgress, &s.Closed, &s.Total); err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}
		staff = append(staff, s)
	}

	ctx.JSON(200, gin.H{"staff": staff})
}

