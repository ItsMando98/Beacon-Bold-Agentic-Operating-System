resource "aws_kms_key" "database" {
  description             = "Beacon Bold staging database encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}
resource "aws_db_subnet_group" "staging" { subnet_ids = aws_subnet.data[*].id }
resource "aws_db_parameter_group" "staging" {
  family = "postgres17"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}
resource "aws_db_instance" "staging" {
  identifier                    = "beacon-bold-staging"
  engine                        = "postgres"
  engine_version                = var.postgres_version
  instance_class                = "db.t4g.micro"
  allocated_storage             = 20
  max_allocated_storage         = 30
  storage_type                  = "gp3"
  storage_encrypted             = true
  kms_key_id                    = aws_kms_key.database.arn
  db_name                       = "beacon"
  username                      = "beacon_owner"
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.database.arn
  db_subnet_group_name          = aws_db_subnet_group.staging.name
  parameter_group_name          = aws_db_parameter_group.staging.name
  vpc_security_group_ids        = [aws_security_group.database.id]
  publicly_accessible           = false
  multi_az                      = false
  backup_retention_period       = 7
  deletion_protection           = true
  skip_final_snapshot           = false
  final_snapshot_identifier     = "beacon-bold-staging-final"
  auto_minor_version_upgrade    = true
  apply_immediately             = false
}
resource "aws_elasticache_subnet_group" "staging" {
  name       = "beacon-bold-staging"
  subnet_ids = aws_subnet.data[*].id
}
resource "aws_elasticache_replication_group" "staging" {
  replication_group_id       = "beacon-bold-staging"
  description                = "Beacon Bold staging Redis"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.t4g.micro"
  num_cache_clusters         = 1
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.staging.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  snapshot_retention_limit   = 1
}
resource "aws_budgets_budget" "staging" {
  name         = "beacon-bold-staging-monthly"
  budget_type  = "COST"
  limit_amount = "150"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  # Account-wide: also catches untagged public IP, transfer and unexpected resources.
  dynamic "notification" {
    for_each = { ACTUAL = 80, FORECASTED = 100 }
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = notification.key
      subscriber_email_addresses = [var.budget_email]
    }
  }
}
