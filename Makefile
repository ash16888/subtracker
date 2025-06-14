.PHONY: help build up down logs shell clean

help:
	@echo "Available commands:"
	@echo "  make build   - Build Docker containers"
	@echo "  make up      - Start containers"
	@echo "  make down    - Stop containers"
	@echo "  make logs    - View container logs"
	@echo "  make shell   - Enter app container shell"
	@echo "  make clean   - Remove containers and volumes"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

shell:
	docker-compose exec app sh

clean:
	docker-compose down -v