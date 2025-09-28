#!/bin/bash

echo "Fixing BigInt to String conversions in tests..."

# Replace BigInt with String in all test files
find tests/ -name "*.ts" -exec sed -i '' 's/BigInt(\([0-9]*\))/"\1"/g' {} \;
find tests/ -name "*.ts" -exec sed -i '' 's/BigInt("\([0-9]*\)")/""\1""/g' {} \;

echo "Fixed BigInt conversions in test files"

# Fix specific telegramId issues
find tests/ -name "*.ts" -exec sed -i '' 's/testUser\.telegramId + BigInt(roles\.indexOf(role))/String(Number(testUser.telegramId) + roles.indexOf(role))/g' {} \;

echo "Fixed telegramId calculations"

# Fix other known issues
find tests/ -name "*.ts" -exec sed -i '' 's/testUserId = testUser\.id;/testUserId = testUser.id;/g' {} \;
find tests/ -name "*.ts" -exec sed -i '' 's/testClientProfileId = testClient\.id;/testClientProfileId = testClient.id;/g' {} \;
find tests/ -name "*.ts" -exec sed -i '' 's/testPhotoId = testPhoto\.id;/testPhotoId = testPhoto.id;/g' {} \;

echo "Test type fixes completed!"
