package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	adminHandlers "github.com/ThakurMayank5/Complaint-Management-System/server/internal/admin"
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/authentication"
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/complaints"
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/middlewares"
	"github.com/ThakurMayank5/Complaint-Management-System/server/internal/operations"
	staffHandlers "github.com/ThakurMayank5/Complaint-Management-System/server/internal/staff"
	users "github.com/ThakurMayank5/Complaint-Management-System/server/internal/user"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/http2"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"

	"google.golang.org/api/option"

	"github.com/gin-contrib/cors"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initFirebase() *auth.Client {
	opt := option.WithCredentialsFile("serviceAccountKey.json")
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Fatal(err)
	}
	client, err := app.Auth(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	return client
}

func registerStaffRoutes(group *gin.RouterGroup, pool *pgxpool.Pool) {
	group.GET("/active_complaints", func(ctx *gin.Context) {
		staffHandlers.HandleGetActiveComplaints(ctx, pool)
	})

	group.GET("/get_complaint_details/:id", func(ctx *gin.Context) {
		staffHandlers.HandleGetComplaintDetails(ctx, pool)
	})

	group.PATCH("/update_complaint_status/:id", func(ctx *gin.Context) {
		staffHandlers.HandleUpdateComplaintStatus(ctx, pool)
	})

	group.GET("/profile", func(ctx *gin.Context) {
		staffHandlers.HandleGetProfile(ctx, pool)
	})

	group.GET("/history", func(ctx *gin.Context) {
		staffHandlers.HandleGetHistory(ctx, pool)
	})

	group.GET("/all_complaints", func(ctx *gin.Context) {
		staffHandlers.HandleGetAllComplaints(ctx, pool)
	})
}

func main() {

	// cert := "cert.pem"
	// key := "key.pem"

	tlsconfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	databaseURL := "postgres://postgres:postgres@localhost:5432/cms?sslmode=disable"

	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("failed to parse database config: %v", err)
		return
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		log.Fatalf("failed to create database pool: %v", err)
		return
	}

	pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		log.Fatalf("failed to ping database: %v", err)
		return
	}

	// Executing Schema Migrations
	schema, err := os.ReadFile("db/schema.sql")
	if err != nil {
		log.Fatalf("failed to read schema.sql: %v", err)
	}

	if _, err := pool.Exec(context.Background(), string(schema)); err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}

	log.Println("Database schema initialized successfully")

	// Load Staff and Admins from the database

	// initialize Firebase
	authClient := initFirebase()

	router := gin.New()

	router.Use(gin.Logger())

	router.Use(gin.Recovery())

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID", "X-Device-Fingerprint"},
		ExposeHeaders:    []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	super_admin := router.Group("/super_admin")
	{
		super_admin.POST("/create", func(ctx *gin.Context) {
			authentication.HandleCreate(ctx, authClient, pool)
		})

		super_admin.POST("/exec", func(ctx *gin.Context) {
			operations.HandleExecuteSQL(ctx, pool)
		})

		super_admin.POST("/query", func(ctx *gin.Context) {
			operations.HandleExecuteSQLQuery(ctx, pool)
		})

	}

	publicAuth := router.Group("/auth")
	{
		publicAuth.POST("/signup", func(ctx *gin.Context) {
			authentication.HandleSignUpUser(ctx, authClient, pool)
		})

	}

	protected := router.Group("/api")
	protected.Use(middlewares.FirebaseAuthMiddleware(authClient))
	{

		// Protected routes go here

		protected.GET("/users/complaints", func(ctx *gin.Context) {
			users.HandleGetComplaints(ctx, pool)
		})

		protected.GET("/users/get_complaint_details/:id", func(ctx *gin.Context) {
			users.HandleGetComplaintDetails(ctx, pool)
		})

		protected.GET("/users/active_complaints", func(ctx *gin.Context) {
			users.HandleGetActiveComplaints(ctx, pool)
		})

		protected.POST("/users/new_complaint", func(ctx *gin.Context) {
			complaints.HandleCreateComplaint(ctx, pool)
		})

		registerStaffRoutes(protected.Group("/staff"), pool)

	}

	staff := router.Group("/staff")
	staff.Use(middlewares.FirebaseAuthMiddleware(authClient))
	// staff.Use(middlewares.StaffRoleMiddleware(authClient))
	{
		registerStaffRoutes(staff, pool)

	}

	admin := router.Group("/api/admin")
	admin.Use(middlewares.FirebaseAuthMiddleware(authClient))
	admin.Use(middlewares.AdminRoleMiddleware())
	{
		admin.GET("/dashboard/stats", func(ctx *gin.Context) {
			adminHandlers.HandleGetDashboardStats(ctx, pool)
		})

		admin.GET("/dashboard/staff_stats", func(ctx *gin.Context) {
			adminHandlers.HandleGetStaffStats(ctx, pool)
		})

		admin.GET("/complaints", func(ctx *gin.Context) {
			adminHandlers.HandleGetAllComplaints(ctx, pool)
		})

		admin.GET("/complaints/search", func(ctx *gin.Context) {
			adminHandlers.HandleSearchComplaints(ctx, pool)
		})

		admin.GET("/complaints/:id", func(ctx *gin.Context) {
			adminHandlers.HandleGetComplaintDetails(ctx, pool)
		})

		admin.PATCH("/complaints/:id/status", func(ctx *gin.Context) {
			adminHandlers.HandleUpdateComplaintStatus(ctx, pool)
		})

		admin.GET("/staff", func(ctx *gin.Context) {
			adminHandlers.HandleGetAllStaff(ctx, pool)
		})
	}

	router.GET("/ping", func(ctx *gin.Context) {
		fmt.Println("ping received")
		ctx.String(http.StatusOK, "pong")
	})

	router.SetTrustedProxies([]string{"127.0.0.1"})

	port := 42069

	server := &http.Server{
		Addr:      fmt.Sprintf(":%d", port),
		TLSConfig: tlsconfig,

		Handler: router,
	}

	http2.ConfigureServer(server, &http2.Server{})

	fmt.Printf("Starting server at Port %d\n", port)

	httpServer := &http.Server{
		Addr:              ":42069",
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("Starting server on %s", httpServer.Addr)
		// err := server.ListenAndServeTLS(cert, key)
		err := httpServer.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	log.Println("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
	pool.Close()
	log.Println("server shutdown complete")

}
