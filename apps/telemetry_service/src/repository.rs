use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::domain::{TelemetryEvent, TelemetryRecord};

/// Сохраняет событие телеметрии в таблицу `telemetry`.
pub async fn insert_event(pool: &PgPool, event: &TelemetryEvent) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO telemetry (device_id, metric, value, unit, recorded_at)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(event.device_id)
    .bind(&event.metric)
    .bind(event.value)
    .bind(&event.unit)
    .bind(event.recorded_at)
    .execute(pool)
    .await?;
    Ok(())
}

/// Возвращает страницу измерений устройства и общее число записей в диапазоне.
pub async fn list_by_device(
    pool: &PgPool,
    device_id: i64,
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
    page: i64,
    page_size: i64,
) -> Result<(Vec<TelemetryRecord>, i64), sqlx::Error> {
    let offset = (page - 1) * page_size;

    let items = sqlx::query_as::<_, TelemetryRecord>(
        r#"SELECT id, device_id, metric, value, unit, recorded_at
           FROM telemetry
           WHERE device_id = $1
             AND ($2::timestamptz IS NULL OR recorded_at >= $2)
             AND ($3::timestamptz IS NULL OR recorded_at <= $3)
           ORDER BY recorded_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(device_id)
    .bind(from)
    .bind(to)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM telemetry
           WHERE device_id = $1
             AND ($2::timestamptz IS NULL OR recorded_at >= $2)
             AND ($3::timestamptz IS NULL OR recorded_at <= $3)"#,
    )
    .bind(device_id)
    .bind(from)
    .bind(to)
    .fetch_one(pool)
    .await?;

    Ok((items, total))
}
