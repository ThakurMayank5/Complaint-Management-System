package operations

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExecuteSQLRequest struct {
	Query string `json:"query" binding:"required"`
}

func HandleExecuteSQL(ctx *gin.Context, db *pgxpool.Pool) {
	var req ExecuteSQLRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	tag, err := db.Exec(ctx, req.Query)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"message": "SQL query executed successfully", "rowsAffected": tag.RowsAffected()})
}

func HandleExecuteSQLQuery(ctx *gin.Context, db *pgxpool.Pool) {
	var req ExecuteSQLRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	rows, err := db.Query(ctx, req.Query)
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	defer rows.Close()

	columns := rows.FieldDescriptions()
	columnNames := make([]string, len(columns))

	for i, col := range columns {
		columnNames[i] = string(col.Name)
	}

	var results []map[string]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			ctx.JSON(500, gin.H{"error": err.Error()})
			return
		}

		rowMap := make(map[string]interface{})
		for i, colName := range columnNames {
			rowMap[colName] = values[i]
		}
		results = append(results, rowMap)
	}

	ctx.JSON(200, gin.H{"results": results})
}
