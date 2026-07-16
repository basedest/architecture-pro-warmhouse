package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"smarthome/models"
)

// DeviceServiceClient регистрирует устройства в микросервисе device-service по REST.
// Регистрация best-effort: ошибки логируются и не возвращаются вызывающему коду.
type DeviceServiceClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewDeviceServiceClient создаёт клиента device-service.
func NewDeviceServiceClient(baseURL string) *DeviceServiceClient {
	return &DeviceServiceClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// RegisterDevice регистрирует сенсор как устройство в device-service.
// 201 и 409 (уже зарегистрировано) считаются успехом.
func (c *DeviceServiceClient) RegisterDevice(sensor models.Sensor) {
	body, err := json.Marshal(map[string]any{
		"serial_number": fmt.Sprintf("SENSOR-%06d", sensor.ID),
		"type_id":       1,
		"house_id":      1,
		"name":          sensor.Name,
	})
	if err != nil {
		log.Printf("device register marshal failed: %v", err)
		return
	}

	url := fmt.Sprintf("%s/api/v1/devices", c.baseURL)
	resp, err := c.httpClient.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("device register request failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict {
		log.Printf("device register unexpected status: %d", resp.StatusCode)
	}
}
