package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"time"
)

// TemperatureResponse matches the JSON contract expected by the smart_home
// monolith (see apps/smart_home/services/temperature_service.go).
type TemperatureResponse struct {
	Value       float64   `json:"value"`
	Unit        string    `json:"unit"`
	Timestamp   time.Time `json:"timestamp"`
	Location    string    `json:"location"`
	Status      string    `json:"status"`
	SensorID    string    `json:"sensor_id"`
	SensorType  string    `json:"sensor_type"`
	Description string    `json:"description"`
}

// resolveLocationAndSensor reproduces the mapping documented in the task template:
// derive the missing field from the one that was provided.
func resolveLocationAndSensor(location, sensorID string) (string, string) {
	// If no location is provided, use a default based on sensor ID.
	if location == "" {
		switch sensorID {
		case "1":
			location = "Living Room"
		case "2":
			location = "Bedroom"
		case "3":
			location = "Kitchen"
		default:
			location = "Unknown"
		}
	}

	// If no sensor ID is provided, generate one based on location.
	if sensorID == "" {
		switch location {
		case "Living Room":
			sensorID = "1"
		case "Bedroom":
			sensorID = "2"
		case "Kitchen":
			sensorID = "3"
		default:
			sensorID = "0"
		}
	}

	return location, sensorID
}

func newTemperatureResponse(location, sensorID string) TemperatureResponse {
	location, sensorID = resolveLocationAndSensor(location, sensorID)

	// Random temperature in [18.0, 28.0).
	value := 18.0 + rand.Float64()*10.0

	return TemperatureResponse{
		Value:       value,
		Unit:        "°C",
		Timestamp:   time.Now(),
		Location:    location,
		Status:      "active",
		SensorID:    sensorID,
		SensorType:  "temperature",
		Description: fmt.Sprintf("Temperature sensor in %s", location),
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to encode response: %v", err)
	}
}

// handleTemperatureByQuery serves GET /temperature?location=&sensorId=
func handleTemperatureByQuery(w http.ResponseWriter, r *http.Request) {
	location := r.URL.Query().Get("location")
	sensorID := r.URL.Query().Get("sensorId")
	resp := newTemperatureResponse(location, sensorID)
	log.Printf("GET /temperature location=%q sensorId=%q -> value=%.2f", location, sensorID, resp.Value)
	writeJSON(w, http.StatusOK, resp)
}

// handleTemperatureByID serves GET /temperature/{id}
func handleTemperatureByID(w http.ResponseWriter, r *http.Request) {
	sensorID := r.PathValue("id")
	location := r.URL.Query().Get("location")
	resp := newTemperatureResponse(location, sensorID)
	log.Printf("GET /temperature/%s -> location=%q value=%.2f", sensorID, resp.Location, resp.Value)
	writeJSON(w, http.StatusOK, resp)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /temperature", handleTemperatureByQuery)
	mux.HandleFunc("GET /temperature/{id}", handleTemperatureByID)
	mux.HandleFunc("GET /health", handleHealth)

	addr := ":" + port
	log.Printf("temperature-api listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
