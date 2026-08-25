package models

type SignUpRequest struct {
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Password  string `json:"password" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	DOB       string `json:"dob" binding:"required"`
	Contact   string `json:"contact" binding:"required"`
}

type User struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	DOB       string `json:"dob"`
	Contact   string `json:"contact"`
	Role      string `json:"role"`
}

type NewComplaintRequest struct {
	Subject     string     `json:"subject" binding:"required"`
	Description string     `json:"description" binding:"required"`
	Category    Category   `json:"category" binding:"required"`
	Department  Department `json:"department" binding:"required"`
	Location    string     `json:"location" binding:"required"`
	Priority    Priority   `json:"priority" binding:"required"`
}

type Complaint struct {
	ID          int        `json:"id"`
	UserID      string     `json:"user_id"`
	Subject     string     `json:"subject"`
	Description string     `json:"description"`
	Category    Category   `json:"category"`
	Department  Department `json:"department"`
	Location    string     `json:"location"`
	Priority    Priority   `json:"priority"`
	Status      Status     `json:"status"`
}

type Priority string

const (
	PriorityLow      Priority = "low"
	PriorityMedium   Priority = "medium"
	PriorityHigh     Priority = "high"
	PriorityCritical Priority = "critical"
)

type Status string

const (
	StatusOpen       Status = "open"
	StatusInProgress Status = "in_progress"
	StatusClosed     Status = "closed"
)

type Staff struct {
	ID         string     `json:"id"`
	FirstName  string     `json:"first_name"`
	LastName   string     `json:"last_name"`
	Email      string     `json:"email"`
	Department Department `json:"department"`

	Queue []string `json:"queue"` // Queue of complaint IDs assigned to the staff member
}

type History struct {
	ID             int    `json:"id"`
	ComplaintID    int    `json:"complaint_id"`
	PreviousStatus Status `json:"previous_status"`
	NewStatus      Status `json:"new_status"`
	ChangedBy      string `json:"changed_by"`      // User ID of the person who changed the status
	ChangedByRole  string `json:"changed_by_role"` // Role of the person who changed the status (user or staff)
	ChangedAt      string `json:"changed_at"`      // Timestamp of when the status was changed
}

type Log struct {
	ID        string `json:"id"`
	Type      string `json:"type"`    // Type of log user creation or status change
	Message   string `json:"message"` // Log message
	Timestamp string `json:"timestamp"`
}

type Admin struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}
