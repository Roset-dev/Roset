# Stage 1: Build FUSE
FROM rust:1.76-bookworm as fuse-builder
WORKDIR /usr/src/roset-fuse
COPY fuse/Cargo.toml fuse/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
COPY fuse/src src
RUN touch src/main.rs && cargo build --release

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
RUN touch src/main.rs && cargo build --release

# Stage 3: Build CLI
FROM golang:1.24-bookworm as cli-builder
WORKDIR /usr/src/roset-cli
# Set proxy just in case, though not needed for most users
ENV GOPROXY=https://proxy.golang.org,direct
COPY cli/go.mod cli/go.sum ./
RUN go mod download
COPY cli/ ./
RUN CGO_ENABLED=0 go build -o roset .

# Stage 4: Final Image
FROM debian:bookworm-slim

# Install runtime dependencies
# fuse3, ca-certificates are critical
# iproute2, procps, curl for debug
RUN apt-get update && apt-get install -y \
    fuse3 \
    libfuse3-dev \
    ca-certificates \
    curl \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy binaries
COPY --from=fuse-builder /usr/src/roset-fuse/target/release/roset-fuse /usr/local/bin/
COPY --from=csi-builder /usr/src/roset-csi/target/release/roset-csi /usr/local/bin/
COPY --from=cli-builder /usr/src/roset-cli/roset /usr/local/bin/

# Default to CSI driver
ENTRYPOINT ["/usr/local/bin/roset-csi"]
