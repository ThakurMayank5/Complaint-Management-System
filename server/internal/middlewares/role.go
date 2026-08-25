package middlewares

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminRoleMiddleware ensures the authenticated user has the "admin" role claim.
func AdminRoleMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, exists := c.Get("claims")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "no claims found"})
			return
		}

		claimsMap, ok := claims.(map[string]interface{})
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid claims"})
			return
		}

		role, ok := claimsMap["role"].(string)
		if !ok || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			return
		}

		c.Next()
	}
}

// StaffRoleMiddleware ensures the authenticated user has the "staff" role claim.
func StaffRoleMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, exists := c.Get("claims")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "no claims found"})
			return
		}

		claimsMap, ok := claims.(map[string]interface{})
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid claims"})
			return
		}

		role, ok := claimsMap["role"].(string)
		if !ok || role != "staff" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "staff access required"})
			return
		}

		c.Next()
	}
}
