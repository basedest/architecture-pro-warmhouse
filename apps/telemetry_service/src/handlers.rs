use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

use crate::domain::TelemetryPage;
use crate::repository;

#[derive(Debug, Deserialize)]
pub struct TelemetryQuery {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// GET /api/v1/devices/:device_id/telemetry
pub async fn get_telemetry(
    State(pool): State<PgPool>,
    Path(device_id): Path<i64>,
    Query(q): Query<TelemetryQuery>,
) -> impl IntoResponse {
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(50).clamp(1, 500);

    match repository::list_by_device(&pool, device_id, q.from, q.to, page, page_size).await {
        Ok((items, total)) => {
            // Неизвестное устройство — пустая страница, а не 404:
            // telemetry-service не ведёт реестр устройств (границы контекста).
            let body = TelemetryPage {
                items,
                page,
                page_size,
                total,
            };
            (StatusCode::OK, Json(body)).into_response()
        }
        Err(err) => {
            tracing::error!("ошибка чтения телеметрии: {err}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "internal server error" })),
            )
                .into_response()
        }
    }
}

/// GET /health
pub async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}
