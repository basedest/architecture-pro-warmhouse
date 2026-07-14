package services

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
)

// TelemetryPublisher публикует измерения телеметрии в Kafka-топик telemetry.raw.
// Публикация асинхронная и best-effort: ошибки логируются и не ломают основной поток.
type TelemetryPublisher struct {
	writer *kafka.Writer
}

// telemetryEvent соответствует AsyncAPI-схеме TelemetryEventPayload.
type telemetryEvent struct {
	DeviceID   int     `json:"device_id"`
	Metric     string  `json:"metric"`
	Value      float64 `json:"value"`
	Unit       string  `json:"unit,omitempty"`
	RecordedAt string  `json:"recorded_at"`
}

// NewTelemetryPublisher создаёт продюсера для указанных брокеров и топика.
func NewTelemetryPublisher(brokers, topic string) *TelemetryPublisher {
	writer := &kafka.Writer{
		Addr:                   kafka.TCP(strings.Split(brokers, ",")...),
		Topic:                  topic,
		AllowAutoTopicCreation: true,
		Async:                  true,
		Completion: func(messages []kafka.Message, err error) {
			if err != nil {
				log.Printf("telemetry publish failed: %v", err)
			}
		},
	}
	return &TelemetryPublisher{writer: writer}
}

// Publish отправляет измерение телеметрии. С Async: true вызов не блокирует обработчик.
func (p *TelemetryPublisher) Publish(deviceID int, value float64, unit string, recordedAt time.Time) {
	payload, err := json.Marshal(telemetryEvent{
		DeviceID:   deviceID,
		Metric:     "temperature",
		Value:      value,
		Unit:       unit,
		RecordedAt: recordedAt.UTC().Format(time.RFC3339),
	})
	if err != nil {
		log.Printf("telemetry marshal failed: %v", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := p.writer.WriteMessages(ctx, kafka.Message{Value: payload}); err != nil {
		log.Printf("telemetry write failed: %v", err)
	}
}

// Close закрывает продюсера.
func (p *TelemetryPublisher) Close() error {
	return p.writer.Close()
}
