# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go.mod and source code
COPY relay/go.mod ./
COPY relay/main.go ./

# Generate go.sum and download dependencies
RUN go mod tidy && go mod download

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o relay .

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /app/relay .

# Copy web files for standalone mode
COPY web ./web

# Expose port
EXPOSE 8080

# Environment variables
ENV ALLOWED_ORIGINS=""
ENV PORT=8080
ENV PASSWORD=""

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run
ENTRYPOINT ["./relay"]
CMD ["--port", "8080"]
