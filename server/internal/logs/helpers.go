package logs

import (
	"context"
	"time"

	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewUserLogEntry(userId string, role string, db *pgxpool.Pool) error {

	log := models.Log{
		ID:        uuid.New().String(),
		Message:   "User created with role: " + role + " and user ID: " + userId,
		Type:      "USER_CREATED",
		Timestamp: time.Now().Format(time.RFC3339),
	}

	_, err := db.Exec(context.Background(), "INSERT INTO logs (id, message,type, timestamp) VALUES ($1, $2, $3, $4)", log.ID, log.Message, log.Type, log.Timestamp)
	if err != nil {
		return err
	}

	return nil
}

func NewComplaintLogEntry(complaintId string, Staff *models.Staff, db *pgxpool.Pool) error {

	var Log models.Log

	Log.ID = uuid.New().String()
	Log.Message = "Complaint with ID: " + complaintId + " assigned to staff member: " + Staff.FirstName + " " + Staff.LastName
	Log.Type = "COMPLAINT_ASSIGNED"
	Log.Timestamp = time.Now().Format(time.RFC3339)

	_, err := db.Exec(context.Background(), "INSERT INTO logs (id, message,type, timestamp) VALUES ($1, $2, $3, $4)", Log.ID, Log.Message, Log.Type, Log.Timestamp)
	if err != nil {
		return err
	}

	return nil

}
