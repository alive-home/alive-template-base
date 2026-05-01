// docker buildx bake
// Build both images: `docker buildx bake`
// Build one:        `docker buildx bake api`
// Push:             `docker buildx bake --push`

variable "REGISTRY"        { default = "ghcr.io/yourorg/template" }
variable "TAG"             { default = "latest" }
variable "API_BASE_URL"    { default = "http://localhost:3001" }
variable "WEB_BASE_URL"    { default = "http://localhost:3000" }
variable "PLATFORMS"       { default = ["linux/amd64", "linux/arm64"] }

group "default" {
  targets = ["api", "web"]
}

target "_common" {
  context    = "."
  platforms  = PLATFORMS
  pull       = true
}

target "api" {
  inherits   = ["_common"]
  dockerfile = "apps/api/Dockerfile"
  tags       = ["${REGISTRY}/api:${TAG}"]
}

target "web" {
  inherits   = ["_common"]
  dockerfile = "apps/web/Dockerfile"
  args = {
    VITE_API_BASE_URL = API_BASE_URL
    VITE_WEB_BASE_URL = WEB_BASE_URL
  }
  tags       = ["${REGISTRY}/web:${TAG}"]
}
