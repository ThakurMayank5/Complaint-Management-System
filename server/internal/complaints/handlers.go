package complaints

import (
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func HandleCreateComplaint(ctx *gin.Context, db *pgxpool.Pool) {

	var req models.NewComplaintRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	userId := ctx.GetString("uid")
	if userId == "" {
		userId = ctx.GetString("user_id")
	}
	if userId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	// Insert the complaint into the database
	query := `INSERT INTO complaints (subject, description, category, department, location, priority, status, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`
	var complaintId string
	err := db.QueryRow(ctx, query, req.Subject, req.Description, req.Category, req.Department, req.Location, req.Priority, models.StatusOpen, userId).Scan(&complaintId)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	staffRows, err := db.Query(ctx, `SELECT id, first_name, last_name, email, department, queue FROM staff WHERE department = $1`, string(req.Department))
	if err != nil {
		ctx.JSON(500, gin.H{"error": "failed to load staff for department: " + err.Error()})
		return
	}
	defer staffRows.Close()

	var matchingStaff []models.Staff
	for staffRows.Next() {
		var staff models.Staff
		if err := staffRows.Scan(&staff.ID, &staff.FirstName, &staff.LastName, &staff.Email, &staff.Department, &staff.Queue); err != nil {
			ctx.JSON(500, gin.H{"error": "failed to scan staff: " + err.Error()})
			return
		}
		matchingStaff = append(matchingStaff, staff)
	}

	if len(matchingStaff) == 0 {
		ctx.JSON(201, gin.H{"id": complaintId, "message": "Complaint created, no staff available for this department"})
		return
	}

	assignedStaff := matchingStaff[0]
	for _, staff := range matchingStaff[1:] {
		if len(staff.Queue) < len(assignedStaff.Queue) {
			assignedStaff = staff
		}
	}

	assignedStaff.Queue = append(assignedStaff.Queue, complaintId)

	updateQuery := `UPDATE staff SET queue = $1 WHERE id = $2`
	if _, err := db.Exec(ctx, updateQuery, assignedStaff.Queue, assignedStaff.ID); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to update staff queue: " + err.Error()})
		return
	}

	// Also set assigned_staff_id on the complaint for easier querying
	if _, err := db.Exec(ctx, `UPDATE complaints SET assigned_staff_id = $1 WHERE id = $2`, assignedStaff.ID, complaintId); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to set assigned staff: " + err.Error()})
		return
	}

	ctx.JSON(201, gin.H{"id": complaintId, "assigned_to": assignedStaff.ID})
}
