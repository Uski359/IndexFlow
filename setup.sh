#!/usr/bin/env bash

##############################################
# IndexFlow — FULL PROJECT SETUP SCRIPT
# Author: ChatGPT (custom-tailored for Umut)
##############################################

set -e

# Colors
GREEN="\033[1;32m"
BLUE="\033[1;34m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
RESET="\033[0m"

line() {
  echo -e "${BLUE}--------------------------------------------------${RESET}"
}

status() {
  echo -e "${GREEN}✔ $1${RESET}"
}

warning() {
  echo -e "${YELLOW}⚠ $1${RESET}"
}

error() {
  echo -e "${RED}✘ $1${RESET}"
}

line
echo -e "${GREEN}INDEXFLOW SETUP STARTING...${RESET}"
line

##############################################
# 1) ENV & DIRECTORY CHECKS
##############################################

echo -e "${BLUE}Checking directories...${RESET}"

[ ! -d "backend" ] && error "backend/ directory not found" && exit 1
[ ! -d "frontend" ] && error "frontend/ directory not found" && exit 1

status "Project directories OK"

##############################################
# 2) ENVIRONMENT CHECK
##############################################

echo -e "${BLUE}Checking .env files...${RESET}"

if [ ! -f "backend/.env" ]; then
  warning "backend/.env missing — copying from .env.example"
  cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env.local" ]; then
  warning "frontend/.env.local missing — copying example"
  cp frontend/.env.example frontend/.env.local
fi

status ".env files OK"

##############################################
# 3) MONGO CHECK
##############################################

echo -e "${BLUE}Checking MongoDB connection...${RESET}"

MONGO_URL=$(grep MONGO_URL backend/.env | cut -d '=' -f2)

if [ -z "$MONGO_URL" ]; then
  error "MONGO_URL is missing in backend/.env"
  exit 1
fi

nc -z localhost 27017 >/dev/null 2>&1 && status "MongoDB is running" || warning "MongoDB may not be running"

##############################################
# 4) INSTALL DEPENDENCIES
##############################################

echo -e "${BLUE}Installing dependencies...${RESET}"

cd backend
npm install --silent
status "Backend dependencies installed"

cd ../frontend
npm install --silent
status "Frontend dependencies installed"

cd ..

##############################################
# 5) CHECK RPC ENV VARIABLES
##############################################

echo -e "${BLUE}Checking RPC endpoints...${RESET}"

required_rpcs=("SEPOLIA_RPC_1")

for rpc in "${required_rpcs[@]}"; do
  value=$(grep $rpc backend/.env | cut -d '=' -f2)
  if [ -z "$value" ]; then
    warning "$rpc missing in backend/.env"
  else
    status "$rpc OK"
  fi
done

##############################################
# 6) START API SERVER
##############################################

line
echo -e "${BLUE}Starting API server...${RESET}"

cd backend
npm run dev &
API_PID=$!
sleep 3

status "API server started (PID: $API_PID)"

##############################################
# 7) HEALTH CHECK
##############################################

echo -e "${BLUE}Pinging API health endpoint...${RESET}"

if curl -s http://localhost:3000/api/health/indexer >/dev/null; then
  status "API responding OK"
else
  warning "API did not respond — continuing anyway"
fi

cd ..

##############################################
# 8) INDEXER BACKFILL (SEPOLIA)
##############################################

echo -e "${BLUE}Running Sepolia backfill (if DB empty)...${RESET}"

cd backend

COUNT=$(node -e "
import { connectDB } from './src/indexer/db/mongo.js';
const run = async () => {
  const db = await connectDB();
  const count = await db.collection('transfers').countDocuments();
  console.log(count);
};
run();
")

if [ "$COUNT" -lt 10 ]; then
  warning "MongoDB empty, running backfill..."
  npm run indexer:backfill:sepolia
  status "Backfill complete"
else
  status "Transfers already exist — skipping backfill"
fi

cd ..

##############################################
# 9) START INDEXER LISTENER(S)
##############################################

line
echo -e "${BLUE}Starting Indexer listener (Sepolia)...${RESET}"

cd backend
npm run indexer:listener:sepolia &
LISTENER_PID=$!
sleep 2

status "Listener running (PID: $LISTENER_PID)"
cd ..

##############################################
# 10) START FRONTEND
##############################################

line
echo -e "${BLUE}Starting Frontend UI...${RESET}"

cd frontend
npm run dev &
UI_PID=$!
sleep 3

status "Frontend running at http://localhost:3001 (PID: $UI_PID)"
cd ..

##############################################
# 11) FINAL STATUS
##############################################

line
echo -e "${GREEN}INDEXFLOW SETUP COMPLETE!${RESET}"
line

echo -e "${BLUE}Running Processes:${RESET}"
echo -e "API:       $API_PID"
echo -e "Listener:  $LISTENER_PID"
echo -e "UI:        $UI_PID"

echo -e "${YELLOW}To stop all processes:${RESET}"
echo -e "${RED}kill $API_PID $LISTENER_PID $UI_PID${RESET}"
line
