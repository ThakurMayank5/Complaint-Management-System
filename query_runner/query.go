package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {

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

	reader := bufio.NewReader(os.Stdin)

	// input query and run it

	for {
		fmt.Print("Enter your SQL query (or type 'exit' to quit): ")

		query, err := reader.ReadString('\n')
		if err != nil {
			log.Printf("failed to read input: %v", err)
			continue
		}

		query = strings.TrimSpace(query)

		if query == "exit" {
			break
		}

		fmt.Printf("Executing query: %s\n", query)

		// execute

		_, err = pool.Exec(context.Background(), query)
		if err != nil {
			log.Printf("failed to execute query: %v", err)
			continue
		}

		// ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		// defer cancel()

		// rows, err := pool.Query(ctx, query)
		// if err != nil {
		// 	log.Printf("failed to execute query: %v", err)
		// 	continue
		// }

		// fmt.Println("Query executed successfully. Results:")
		// for rows.Next() {
		// 	values, err := rows.Values()
		// 	if err != nil {
		// 		log.Printf("failed to get row values: %v", err)
		// 		continue
		// 	}
		// 	fmt.Println(values)
		// }

	}

}
