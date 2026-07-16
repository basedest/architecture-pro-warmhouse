mod consumer;
mod domain;
mod handlers;
mod repository;

use std::env;
use std::time::Duration;

use axum::routing::get;
use axum::Router;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tokio::net::TcpListener;

/// Конфигурация сервиса из переменных окружения.
#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub kafka_brokers: String,
    pub kafka_topic: String,
    pub kafka_group_id: String,
}

impl Config {
    fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8083),
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgres://postgres:postgres@localhost:5432/telemetry_service".to_string()
            }),
            kafka_brokers: env::var("KAFKA_BROKERS").unwrap_or_else(|_| "kafka:9092".to_string()),
            kafka_topic: env::var("KAFKA_TOPIC").unwrap_or_else(|_| "telemetry.raw".to_string()),
            kafka_group_id: env::var("KAFKA_GROUP_ID")
                .unwrap_or_else(|_| "telemetry-service".to_string()),
        }
    }
}

const SCHEMA_DDL: &str = r#"
CREATE TABLE IF NOT EXISTS telemetry (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT,
    recorded_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"#;

async fn connect_pool(database_url: &str) -> PgPool {
    for attempt in 1..=10 {
        match PgPoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await
        {
            Ok(pool) => return pool,
            Err(err) => {
                tracing::warn!("попытка подключения к БД {attempt}/10 не удалась: {err}");
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    }
    panic!("не удалось подключиться к базе данных после 10 попыток");
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let cfg = Config::from_env();
    tracing::info!("запуск telemetry-service на порту {}", cfg.port);

    let pool = connect_pool(&cfg.database_url).await;
    sqlx::query(SCHEMA_DDL)
        .execute(&pool)
        .await
        .expect("не удалось инициализировать схему telemetry_service");
    tracing::info!("схема telemetry_service инициализирована");

    tokio::spawn(consumer::run(pool.clone(), cfg.clone()));

    let api_routes = Router::new().route(
        "/devices/:device_id/telemetry",
        get(handlers::get_telemetry),
    );

    let app = Router::new()
        .route("/health", get(handlers::health))
        .nest("/api/v1", api_routes)
        .with_state(pool);

    let addr = format!("0.0.0.0:{}", cfg.port);
    let listener = TcpListener::bind(&addr)
        .await
        .expect("не удалось открыть TCP-сокет");
    tracing::info!("HTTP-сервер слушает {addr}");
    axum::serve(listener, app)
        .await
        .expect("сбой HTTP-сервера");
}
