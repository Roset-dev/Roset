# Build stage
FROM rust:1.76-bookworm as builder

WORKDIR /usr/src/roset

# Copy manifests
COPY Cargo.toml Cargo.lock ./
COPY fuse/Cargo.toml fuse/Cargo.toml
COPY monorepo/csi/Cargo.toml monorepo/csi/Cargo.toml
# Create dummy sources to cache dependencies
RUN mkdir -p fuse/src && echo "fn main() {}" > fuse/src/main.rs
RUN mkdir -p monorepo/csi/src && echo "fn main() {}" > monorepo/csi/src/main.rs

# Build dependencies
RUN cargo build --release

# Copy actual source code
COPY fuse/src fuse/src
COPY monorepo/csi/src monorepo/csi/src
COPY monorepo/csi/proto monorepo/csi/proto
COPY monorepo/csi/build.rs monorepo/csi/build.rs

# Build release binaries (touch main.rs to force rebuild)
RUN touch fuse/src/main.rs && touch monorepo/csi/src/main.rs
RUN cargo build --release

# Final stage
FROM debian:bookworm-slim

# Install FUSE dependencies
RUN apt-get update && apt-get install -y \
    fuse3 \
    libfuse3-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy binaries
COPY --from=builder /usr/src/roset/target/release/roset-fuse /usr/local/bin/
COPY --from=builder /usr/src/roset/target/release/roset-csi /usr/local/bin/

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/roset-csi"]
