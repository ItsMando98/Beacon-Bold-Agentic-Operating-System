terraform {
  required_version = "~> 1.13.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.14.0"
    }
  }
  # Bootstrap an encrypted, versioned S3 backend separately before apply.
  backend "s3" {}
}

provider "aws" {
  region              = "eu-central-1"
  allowed_account_ids = ["212626318809"]
  default_tags {
    tags = { Project = "beacon-bold", Environment = "staging", ManagedBy = "terraform" }
  }
}
