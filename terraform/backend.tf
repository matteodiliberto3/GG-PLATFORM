# Remote backend: encryption and state locking.
# Uncomment ONE block and set values via env or CLI (no secrets in repo).
#
# Option A: Terraform Cloud
# terraform {
#   backend "remote" {
#     organization = "YOUR_ORG"
#     workspaces {
#       name = "gg-platform"
#     }
#   }
# }
#
# Option B: S3 (AWS) with encryption and DynamoDB lock
# terraform {
#   backend "s3" {
#     bucket         = "YOUR_TF_STATE_BUCKET"
#     key            = "gg-platform/terraform.tfstate"
#     region         = "eu-west-1"
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock"
#   }
# }
#
# For local/test: default local backend (no block). State is in .terraform/ and must not be committed.
