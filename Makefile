VERSION        ?= $(shell git describe --tags --always )
TARGET         ?= $(shell basename `git rev-parse --show-toplevel`)
TEST           ?= $(shell go list ./... | grep -v /vendor/)
REPOSITORY     := mattdeboer/${TARGET}
DOCKER_IMAGE   ?= ${REPOSITORY}:${VERSION}
BRANCH         ?= $(shell git rev-parse --abbrev-ref HEAD)
REVISION       ?= $(shell git rev-parse HEAD)
LD_FLAGS       ?= -s -X github.com/matt-deboer/${TARGET}/pkg/version.Name=$(TARGET) \
	-X github.com/matt-deboer/${TARGET}/pkg/version.Revision=$(REVISION) \
	-X github.com/matt-deboer/${TARGET}/pkg/version.Branch=$(BRANCH) \
	-X github.com/matt-deboer/${TARGET}/pkg/version.Version=$(VERSION)

default: test build

test:
	go test -v -cover -run=$(RUN) $(TEST)

build: clean
	@go build -v -o bin/$(TARGET) -ldflags "$(LD_FLAGS)+local_changes" ./pkg/server

pkg/ui/build:
	cd pkg/ui && npm run release

release-ui: pkg/ui/build
	@go get github.com/jteeuwen/go-bindata/...
	go-bindata -o pkg/server/ui.go -prefix "pkg/ui/build" pkg/ui/build/...

release: clean release-ui
	CGO_ENABLED=0 GOARCH=amd64 GOOS=linux go build \
		-a -tags netgo \
		-a -installsuffix cgo \
    -ldflags "$(LD_FLAGS)" \
		-o bin/$(TARGET) ./pkg/server

ca-certificates.crt:
	@-docker rm -f ${TARGET}_cacerts
	@docker run --name ${TARGET}_cacerts debian:latest bash -c 'apt-get update && apt-get install -y ca-certificates'
	@docker cp ${TARGET}_cacerts:/etc/ssl/certs/ca-certificates.crt .
	@docker rm -f ${TARGET}_cacerts

docker: ca-certificates.crt release
	@echo "Building ${DOCKER_IMAGE}..."
	@docker build -t ${DOCKER_IMAGE} -f Dockerfile .

pkg/ui/test-proxy/node_modules:
	cd pkg/ui && npm run build-test-proxy

pkg/ui/node_modules:
	cd pkg/ui && npm install

analyze-ui:
	cd pkg/ui && npm run build && npm run analyze

dev-ui: | pkg/ui/node_modules pkg/ui/test-proxy/node_modules 
	# now move to the ui dir and run dev
	cd pkg/ui && npm run dev

minidev: build pkg/ui/node_modules
	hack/minikube-dev.sh

currentdev: build pkg/ui/node_modules
	hack/current-context-dev.sh

acceptance:
	hack/acceptance-tests.sh

acceptance-dev:
	cd pkg/ui && CYPRESS_baseUrl=http://localhost:3000 npm run cypress:open

start-ui: | pkg/ui/node_modules pkg/ui/test-proxy/node_modules 
	cd pkg/ui && npm start

clean-ui:
	@rm -rf pkg/ui/build

clean:
	@rm -rf bin/