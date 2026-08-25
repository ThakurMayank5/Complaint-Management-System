package authentication

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"firebase.google.com/go/auth"
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func HandleSignUpUser(ctx *gin.Context, authClient *auth.Client, db *pgxpool.Pool) {
	var req models.SignUpRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	params := (&auth.UserToCreate{}).
		Email(req.Email).
		Password(req.Password).
		DisplayName(req.FirstName + " " + req.LastName)

	userRecord, err := authClient.CreateUser(context.Background(), params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error creating user in Firebase: %v", err)})
		return
	}

	dbInserted := false

	// rollback helper closes over what's been created so far
	rollback := func() {
		if dbInserted {
			if _, err := db.Exec(context.Background(), `DELETE FROM users WHERE uid = $1`, userRecord.UID); err != nil {
				log.Printf("rollback: failed to delete db row for uid %s: %v", userRecord.UID, err)
			}
		}
		if err := authClient.DeleteUser(context.Background(), userRecord.UID); err != nil {
			log.Printf("rollback: failed to delete firebase user %s: %v", userRecord.UID, err)
		}
	}

	// store firstname, last name, and email dob, contact in the database

	user := models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		DOB:       req.DOB,
		Contact:   req.Contact,
	}

	query := `INSERT INTO users (uid, email, first_name, last_name, date_of_birth, contact) VALUES ($1, $2, $3, $4, $5, $6)`
	if _, err = db.Exec(context.Background(), query, userRecord.UID, user.Email, user.FirstName, user.LastName, user.DOB, user.Contact); err != nil {
		log.Printf("error inserting user into database: %v", err)
		rollback()
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user"})
		return
	}
	dbInserted = true

	customClaims := map[string]interface{}{"role": "user"}

	if err = authClient.SetCustomUserClaims(context.Background(), userRecord.UID, customClaims); err != nil {
		log.Printf("error setting custom claims: %v", err)
		rollback()
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set custom claims"})
		return
	}

	token, err := authClient.CustomTokenWithClaims(context.Background(), userRecord.UID, customClaims)
	if err != nil {
		log.Printf("error creating custom token: %v", err)
		rollback()
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create custom token"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"token": token})
}
