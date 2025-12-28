# Stage 1: Build FUSE
FROM rust:1.76-bookworm as fuse-builder
WORKDIR /usr/src/roset-fuse
COPY fuse/Cargo.toml fuse/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
COPY fuse/src src
RUN touch src/main.rs && cargo build --release --locked

# Stage 2: Build CSI
FROM rust:1.76-bookworm as csi-builder
WORKDIR /usr/src/roset-csi
COPY csi/Cargo.toml csi/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
# csi depends on protobuf compiler
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*
RUN cargo build --release
COPY csi/src src
COPY csi/proto proto
COPY csi/build.rs build.rs
RUN touch src/main.rs && cargo build --release --locked

# Stage 3: Build CLI
FROM golang:1.24-bookworm as cli-builder
WORKDIR /usr/src/roset-cli
ENV CGO_ENABLED=0
ENV GOPROXY=https://proxy.golang.org,direct
COPY cli/go.mod cli/go.sum ./
RUN go mod download
COPY cli/ ./
RUN go build -o roset .

# Stage 4: Final Image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    fuse3 \
    libfuse3-3 \
    ca-certificates \
    util-linux \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Copy binaries
COPY --from=fuse-builder /usr/src/roset-fuse/target/release/roset-fuse /usr/local/bin/
COPY --from=csi-builder /usr/src/roset-csi/target/release/roset-csi /usr/local/bin/
COPY --from=cli-builder /usr/src/roset-cli/roset /usr/local/bin/

# Use tini as init process
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/roset-csi"]
