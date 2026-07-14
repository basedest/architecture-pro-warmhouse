use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Событие телеметрии из Kafka-топика `telemetry.raw`.
/// Точно соответствует AsyncAPI-схеме `TelemetryEventPayload`.
#[derive(Debug, Clone, Deserialize)]
pub struct TelemetryEvent {
    pub device_id: i64,
    pub metric: String,
    pub value: f64,
    #[serde(default)]
    pub unit: Option<String>,
    pub recorded_at: DateTime<Utc>,
}

/// Запись телеметрии, хранимая в БД и возвращаемая в API.
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct TelemetryRecord {
    pub id: i64,
    pub device_id: i64,
    pub metric: String,
    pub value: f64,
    pub unit: Option<String>,
    pub recorded_at: DateTime<Utc>,
}

/// Страница измерений телеметрии согласно OpenAPI-схеме `TelemetryPage`.
#[derive(Debug, Serialize)]
pub struct TelemetryPage {
    pub items: Vec<TelemetryRecord>,
    pub page: i64,
    pub page_size: i64,
    pub total: i64,
}
