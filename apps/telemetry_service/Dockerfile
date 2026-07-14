FROM rust:1.90-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends cmake && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release && rm -rf src
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/telemetry-service /usr/local/bin/telemetry-service
EXPOSE 8083
CMD ["telemetry-service"]
