use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use sqlx::PgPool;

use crate::domain::TelemetryEvent;
use crate::repository;
use crate::Config;

/// Запускает бесконечный цикл потребления телеметрии из Kafka.
/// Любая ошибка (Kafka, JSON, БД) логируется и не прерывает цикл.
pub async fn run(pool: PgPool, cfg: Config) {
    let consumer: StreamConsumer = match ClientConfig::new()
        .set("group.id", &cfg.kafka_group_id)
        .set("bootstrap.servers", &cfg.kafka_brokers)
        .set("auto.offset.reset", "earliest")
        .set("allow.auto.create.topics", "true")
        .create()
    {
        Ok(c) => c,
        Err(err) => {
            tracing::error!("не удалось создать Kafka-консюмер: {err}");
            return;
        }
    };

    if let Err(err) = consumer.subscribe(&[&cfg.kafka_topic]) {
        tracing::error!("не удалось подписаться на топик {}: {err}", cfg.kafka_topic);
        return;
    }

    tracing::info!(
        "консюмер телеметрии слушает топик '{}' на брокерах '{}'",
        cfg.kafka_topic,
        cfg.kafka_brokers
    );

    loop {
        match consumer.recv().await {
            Ok(msg) => {
                let Some(payload) = msg.payload() else {
                    continue;
                };
                match serde_json::from_slice::<TelemetryEvent>(payload) {
                    Ok(event) => {
                        if let Err(err) = repository::insert_event(&pool, &event).await {
                            tracing::warn!("не удалось сохранить телеметрию: {err}");
                        }
                    }
                    Err(err) => {
                        tracing::warn!("некорректное сообщение телеметрии: {err}");
                    }
                }
            }
            Err(err) => {
                tracing::warn!("ошибка чтения из Kafka: {err}");
            }
        }
    }
}
