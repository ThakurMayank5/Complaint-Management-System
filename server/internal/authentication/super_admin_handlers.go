package authentication

import (
	"strings"

	"firebase.google.com/go/auth"
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SignUpRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Department string `json:"department"`
	Role       string `json:"role"`
}

func HandleCreate(ctx *gin.Context, authClient *auth.Client, db *pgxpool.Pool) {

	// get the authorization header token from the request and check if email matches super admin email verify token and then allow to create admin or staff user
	if authClient == nil {
		ctx.JSON(500, gin.H{"error": "Firebase auth client is not initialized"})
		return
	}

	authHeader := ctx.GetHeader("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		ctx.JSON(401, gin.H{"error": "Unauthorized: missing bearer token"})
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")

	// verify the token using firebase auth client
	cla, err := authClient.VerifyIDToken(ctx, token)
	if err != nil {
		ctx.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	email, ok := cla.Claims["email"].(string)
	if !ok || email != "mayank.singh5t@gmail.com" {
		ctx.JSON(403, gin.H{"error": "Forbidden: only the super admin can create users"})
		return
	}

	var req SignUpRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Role != "admin" && req.Role != "staff" {
		ctx.JSON(400, gin.H{"error": "Invalid role. Must be 'admin' or 'staff'"})
		return
	}

	if req.Role == "staff" && req.Department == "" {
		ctx.JSON(400, gin.H{"error": "Department is required for staff role"})
		return
	}

	if req.Role == "admin" {
		// Create a new user in Firebase Authentication
		params := (&auth.UserToCreate{}).
			Email(req.Email).
			Password(req.Password).
			DisplayName(req.FirstName + " " + req.LastName)

		userRecord, err := authClient.CreateUser(ctx, params)
		if err != nil {
			ctx.JSON(500, gin.H{"error": "Failed to create user in Firebase: " + err.Error()})
			return
		}

		dbInserted := false

		// rollback helper closes over what's been created so far
		rollback := func() {
			if dbInserted {
				if _, err := db.Exec(ctx, `DELETE FROM admins WHERE id = $1`, userRecord.UID); err != nil {
					ctx.JSON(500, gin.H{"error": "Rollback failed to delete admin from database: " + err.Error()})
				}
			}
			if err := authClient.DeleteUser(ctx, userRecord.UID); err != nil {
				ctx.JSON(500, gin.H{"error": "Rollback failed to delete user from Firebase: " + err.Error()})
			}
		}

		admin := models.Admin{
			ID:        userRecord.UID,
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Email:     req.Email,
		}

		query := `INSERT INTO admins (id, email, first_name, last_name) VALUES ($1, $2, $3, $4)`
		if _, err = db.Exec(ctx, query, admin.ID, admin.Email, admin.FirstName, admin.LastName); err != nil {
			rollback()
			ctx.JSON(500, gin.H{"error": "Failed to save admin in database: " + err.Error()})
			return
		}

		dbInserted = true

		customClaims := map[string]interface{}{"role": "admin"}

		if err = authClient.SetCustomUserClaims(ctx, userRecord.UID, customClaims); err != nil {
			rollback()
			ctx.JSON(500, gin.H{"error": "Failed to set custom claims: " + err.Error()})
			return
		}

		ctx.JSON(201, gin.H{"message": "Admin created successfully"})
		return
	}

	if req.Role == "staff" {
		params := (&auth.UserToCreate{}).
			Email(req.Email).
			Password(req.Password).
			DisplayName(req.FirstName + " " + req.LastName)

		userRecord, err := authClient.CreateUser(ctx, params)
		if err != nil {
			ctx.JSON(500, gin.H{"error": "Failed to create staff user in Firebase: " + err.Error()})
			return
		}

		dbInserted := false

		rollback := func() {
			if dbInserted {
				if _, err := db.Exec(ctx, `DELETE FROM staff WHERE id = $1`, userRecord.UID); err != nil {
					ctx.JSON(500, gin.H{"error": "Rollback failed to delete staff from database: " + err.Error()})
				}
			}
			if err := authClient.DeleteUser(ctx, userRecord.UID); err != nil {
				ctx.JSON(500, gin.H{"error": "Rollback failed to delete staff from Firebase: " + err.Error()})
			}
		}

		staff := models.Staff{
			ID:         userRecord.UID,
			FirstName:  req.FirstName,
			LastName:   req.LastName,
			Email:      req.Email,
			Department: models.Department(req.Department),
		}

		query := `INSERT INTO staff (id, email, first_name, last_name, department) VALUES ($1, $2, $3, $4, $5)`
		if _, err = db.Exec(ctx, query, staff.ID, staff.Email, staff.FirstName, staff.LastName, string(staff.Department)); err != nil {
			rollback()
			ctx.JSON(500, gin.H{"error": "Failed to save staff in database: " + err.Error()})
			return
		}

		dbInserted = true

		customClaims := map[string]interface{}{"role": "staff"}

		if err = authClient.SetCustomUserClaims(ctx, userRecord.UID, customClaims); err != nil {
			rollback()
			ctx.JSON(500, gin.H{"error": "Failed to set staff claims: " + err.Error()})
			return
		}

		ctx.JSON(201, gin.H{"message": "Staff created successfully"})
		return
	}

	ctx.JSON(400, gin.H{"error": "Unsupported role"})

}
