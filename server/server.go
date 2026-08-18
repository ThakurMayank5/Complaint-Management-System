package main

import (
	"net/http"
	
	"github.com/gin-gonic/gin"
)

func main() {

	router := gin.New()

	router.Use()

	router.Use(gin.Recovery())


	router.GET("/ping", func(ctx *gin.Context) {
		ctx.String(http.StatusOK, "pong")
	})

	router.SetTrustedProxies([]string{"127.0.0.1"})

	router.Run("127.0.0.1:42069")

}

