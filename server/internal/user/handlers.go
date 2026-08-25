package users

import (
	"log"
	"strconv"

	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func HandleGetComplaints(ctx *gin.Context, db *pgxpool.Pool) {
	userId := ctx.GetString("uid")
	if userId == "" {
		userId = ctx.GetString("user_id")
	}
	if userId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	log.Println("User ID from context:", userId) // Debugging line

	// Fetch complaints from the database for the given user ID
	query := `SELECT id, subject, description, category, department, location, priority, status, user_id FROM complaints WHERE user_id = $1`
	rows, err := db.Query(ctx, query, userId)

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

	log.Println("Complaints fetched:", complaints) // Debugging line

	ctx.JSON(200, gin.H{"complaints": complaints})

}

type ComplaintDetailsResponse struct {
	Complaint models.Complaint `json:"complaint"`
	Staff     models.Staff     `json:"staff"`
}

func HandleGetComplaintDetails(ctx *gin.Context, db *pgxpool.Pool) {
	complaintIdParam := ctx.Param("id")
	complaintID, err := strconv.Atoi(complaintIdParam)
	if err != nil {
		ctx.JSON(400, gin.H{"error": "invalid complaint id"})
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

	query := `SELECT id, subject, description, category, department, location, priority, status, user_id FROM complaints WHERE id = $1 AND user_id = $2`
	var complaint models.Complaint
	err = db.QueryRow(ctx, query, complaintID, userId).Scan(&complaint.ID, &complaint.Subject, &complaint.Description, &complaint.Category, &complaint.Department, &complaint.Location, &complaint.Priority, &complaint.Status, &complaint.UserID)
	if err != nil {
		ctx.JSON(404, gin.H{"error": "complaint not found"})
		return
	}

	var staff models.Staff
	staffQuery := `SELECT id, first_name, last_name, email, department, queue FROM staff WHERE department = $1 ORDER BY array_length(queue, 1) NULLS LAST LIMIT 1`
	err = db.QueryRow(ctx, staffQuery, string(complaint.Department)).Scan(&staff.ID, &staff.FirstName, &staff.LastName, &staff.Email, &staff.Department, &staff.Queue)
	if err != nil {
		staff = models.Staff{}
	}

	response := ComplaintDetailsResponse{
		Complaint: complaint,
		Staff:     staff,
	}

	ctx.JSON(200, response)
}

func HandleGetActiveComplaints(ctx *gin.Context, db *pgxpool.Pool) {
	userId := ctx.GetString("uid")

	if userId == "" {
		userId = ctx.GetString("user_id")
	}

	if userId == "" {
		ctx.JSON(401, gin.H{"error": "user not authenticated"})
		return
	}

	// Fetch active complaints from the database for the given user ID where status is 'open' or 'in_progress'
	query := `SELECT id, subject, description, category, department, location, priority, status, user_id FROM complaints WHERE user_id = $1 AND (status = $2 OR status = $3)`
	rows, err := db.Query(ctx, query, userId, models.StatusOpen, models.StatusInProgress)

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

	ctx.JSON(200, gin.H{"complaints": complaints})
}
