#!/bin/bash

echo "Java 17 install kar rahe hain..."

# Step 1: Homebrew permissions fix (sudo password chahiye)
echo "Step 1: Homebrew permissions fix kar rahe hain..."
sudo chown -R $(whoami) /opt/homebrew /Users/$(whoami)/Library/Logs/Homebrew

# Step 2: Java 17 install
echo "Step 2: Java 17 install kar rahe hain..."
brew install openjdk@17

# Step 3: Java symlink create karein
echo "Step 3: Java symlink create kar rahe hain..."
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Step 4: JAVA_HOME update karein .zshrc mein
echo "Step 4: JAVA_HOME update kar rahe hain..."
JAVA_HOME_PATH="/opt/homebrew/opt/openjdk@17"

# Backup .zshrc
cp ~/.zshrc ~/.zshrc.backup

# Update JAVA_HOME in .zshrc
sed -i '' "s|export JAVA_HOME=.*|export JAVA_HOME=$JAVA_HOME_PATH|g" ~/.zshrc

echo "✅ Java 17 install ho gaya!"
echo "📝 Ab terminal restart karein ya ye command run karein:"
echo "   source ~/.zshrc"
echo ""
echo "Verify karne ke liye:"
echo "   java -version"
echo "   echo \$JAVA_HOME"
