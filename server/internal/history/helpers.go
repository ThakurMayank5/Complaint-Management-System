package history

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func MakeEntry(db *pgxpool.Pool, complaintID int, previousStatus string, newStatus string, changedBy string, changedByRole string, changedAt string) error {
	query := `INSERT INTO complaint_history (complaint_id, previous_status, new_status, changed_by, changed_by_role, changed_at) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := db.Exec(context.Background(), query, complaintID, previousStatus, newStatus, changedBy, changedByRole, changedAt)
	return err
}
