#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}🚀 IASDS - Intelligent Academic Scheduling & Decision-Support System Launcher${NC}"
echo -e "${CYAN}========================================================================${NC}\n"

# Get the script directory and root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check Docker Compose first
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
  echo -e "${GREEN}✓ Docker is installed.${NC}"
  echo -e "${YELLOW}Would you like to run the entire stack (including databases) via Docker Compose?${NC}"
  read -p "Run via Docker? (y/N): " run_docker
  if [[ "$run_docker" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting Docker containers in the background...${NC}"
    docker compose -f "$ROOT_DIR/docker-compose.yml" up --build -d
    echo -e "\n${GREEN}🎉 Stack started!${NC}"
    echo -e "Frontend:   ${BOLD}http://localhost${NC} (via Nginx proxy)"
    echo -e "Backend:    ${BOLD}http://localhost/api${NC}"
    echo -e "To view logs: ${BOLD}docker compose logs -f${NC}"
    echo -e "To stop:      ${BOLD}docker compose down${NC}"
    exit 0
  fi
fi

# Checking local dependencies
echo -e "\n${YELLOW}Checking local dependencies...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VER=$(node -v)
  echo -e "${GREEN}✓ Node.js is installed ($NODE_VER)${NC}"
else
  echo -e "${RED}✗ Node.js is not installed. Please install Node.js (v18+)${NC}"
fi

# Check Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
  PYTHON_CMD="python3"
  PYTHON_VER=$(python3 --version)
  echo -e "${GREEN}✓ Python is installed ($PYTHON_VER)${NC}"
elif command -v python &> /dev/null; then
  PYTHON_CMD="python"
  PYTHON_VER=$(python --version)
  echo -e "${GREEN}✓ Python is installed ($PYTHON_VER)${NC}"
else
  echo -e "${RED}✗ Python is not installed. Please install Python 3.10+${NC}"
fi

# Check MongoDB
if command -v mongod &> /dev/null; then
  echo -e "${GREEN}✓ MongoDB server CLI (mongod) is available locally${NC}"
else
  echo -e "${YELLOW}⚠ MongoDB CLI not found. Make sure MongoDB is running locally or configured via MONGO_URI in .env${NC}"
fi

# Run options
echo -e "\n${YELLOW}Select an action to launch services:${NC}"
echo -e "1) Start All Services (Backend, Scheduler, Frontend) in background logs"
echo -e "2) Start Backend API only"
echo -e "3) Start Scheduler only"
echo -e "4) Start Frontend only"
echo -e "5) Exit"
read -p "Select [1-5]: " choice

case $choice in
  1)
    echo -e "\n${GREEN}Starting all services... Logs will be piped to service.log${NC}"
    
    # 1. Start Backend
    echo -e "${CYAN}Starting Backend API...${NC}"
    cd "$ROOT_DIR/backend"
    npm run dev > "$ROOT_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    
    # 2. Start Scheduler
    echo -e "${CYAN}Starting Python Scheduler...${NC}"
    cd "$ROOT_DIR/scheduler"
    if [ -d "venv" ]; then
      source venv/bin/activate
    fi
    $PYTHON_CMD main.py > "$ROOT_DIR/scheduler.log" 2>&1 &
    SCHEDULER_PID=$!
    
    # 3. Start Frontend
    echo -e "${CYAN}Starting Frontend...${NC}"
    cd "$ROOT_DIR/frontend"
    npm run dev > "$ROOT_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    
    echo -e "\n${GREEN}🎉 Services started in background!${NC}"
    echo -e "Backend PID:   $BACKEND_PID (Logs: backend.log)"
    echo -e "Scheduler PID: $SCHEDULER_PID (Logs: scheduler.log)"
    echo -e "Frontend PID:  $FRONTEND_PID (Logs: frontend.log)"
    echo -e "\nPress Ctrl+C to stop all background processes..."
    
    trap "kill $BACKEND_PID $SCHEDULER_PID $FRONTEND_PID 2>/dev/null; echo -e '\nStopped all services.'; exit" INT
    
    # Wait for background processes
    wait
    ;;
  2)
    echo -e "\n${GREEN}Starting Backend API...${NC}"
    cd "$ROOT_DIR/backend"
    npm run dev
    ;;
  3)
    echo -e "\n${GREEN}Starting Python Scheduler...${NC}"
    cd "$ROOT_DIR/scheduler"
    if [ -d "venv" ]; then
      source venv/bin/activate
    fi
    $PYTHON_CMD main.py
    ;;
  4)
    echo -e "\n${GREEN}Starting Frontend...${NC}"
    cd "$ROOT_DIR/frontend"
    npm run dev
    ;;
  *)
    echo "Exiting..."
    exit 0
    ;;
esac
