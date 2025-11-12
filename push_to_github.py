#!/usr/bin/env python3
import os
import sys
import subprocess
import json

# Check if running with GitHub token
github_token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')

if not github_token:
    print("❌ No GitHub token found in environment")
    print("\nI need your GitHub Personal Access Token to push.")
    print("Create one at: https://github.com/settings/tokens/new")
    print("Scope needed: 'repo'")
    print("\nThen run:")
    print("export GITHUB_TOKEN='your_token_here'")
    print("python3 push_to_github.py")
    sys.exit(1)

# Get GitHub username from token
import requests
headers = {'Authorization': f'token {github_token}'}
user_response = requests.get('https://api.github.com/user', headers=headers)

if user_response.status_code != 200:
    print(f"❌ GitHub authentication failed: {user_response.status_code}")
    sys.exit(1)

github_user = user_response.json()['login']
print(f"✅ Authenticated as: {github_user}")

# Create repository
repo_name = 'github-developer-tools-suite'
repo_data = {
    'name': repo_name,
    'description': 'AI-Powered GitHub Developer Tools Suite - 5 automation tools powered by Claude AI',
    'homepage': 'https://github-dev-tools.com',
    'private': False,
    'has_issues': True,
    'has_projects': True,
    'has_wiki': True
}

print(f"\n📦 Creating repository: {repo_name}")
create_response = requests.post(
    'https://api.github.com/user/repos',
    headers=headers,
    json=repo_data
)

if create_response.status_code == 201:
    print("✅ Repository created!")
elif create_response.status_code == 422:
    print("⚠️  Repository already exists, will use existing")
else:
    print(f"❌ Failed to create repository: {create_response.status_code}")
    print(create_response.json())
    sys.exit(1)

# Add remote and push
repo_url = f"https://{github_token}@github.com/{github_user}/{repo_name}.git"
print(f"\n🔗 Adding remote: https://github.com/{github_user}/{repo_name}")

# Remove existing remote
subprocess.run(['git', 'remote', 'remove', 'origin'], capture_output=True)

# Add new remote
subprocess.run(['git', 'remote', 'add', 'origin', repo_url], check=True)
subprocess.run(['git', 'branch', '-M', 'main'], check=True)

print("\n🚀 Pushing to GitHub...")
result = subprocess.run(['git', 'push', '-u', 'origin', 'main'], capture_output=True, text=True)

if result.returncode == 0:
    print("\n✅ SUCCESS! Code pushed to GitHub!")
    print(f"\n🎉 Your repository: https://github.com/{github_user}/{repo_name}")
    print("\n📋 Next steps:")
    print("1. View your repo: https://github.com/{}/{}/".format(github_user, repo_name))
    print("2. Deploy to Vercel")
    print("3. Submit to GitHub Marketplace")
    print("\n💰 Start making money!")
else:
    print(f"❌ Push failed: {result.stderr}")
    sys.exit(1)

