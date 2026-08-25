// type SignUpRequest struct {
// 	FirstName string `json:"first_name" binding:"required"`
// 	LastName  string `json:"last_name" binding:"required"`
// 	Password  string `json:"password" binding:"required"`
// 	Email     string `json:"email" binding:"required,email"`
// 	DOB       string `json:"dob" binding:"required"`
// 	Contact   string `json:"contact" binding:"required"`
// }

export interface SignUpRequest {
  first_name: string;
  last_name: string;
  password: string;
  email: string;
  dob: string;
  contact: string;
}
