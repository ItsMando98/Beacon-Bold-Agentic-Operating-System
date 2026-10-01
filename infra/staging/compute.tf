locals {
  services = { web = 3000, app = 3001, api = 3002, migrate = 3003 }
  secret_keys = {
    web     = []
    app     = ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]
    api     = ["DATABASE_URL", "REDIS_URL"]
    migrate = ["DB_APP_PASSWORD"]
  }
}
resource "aws_ecr_repository" "service" {
  for_each             = local.services
  name                 = "beacon-bold-staging-${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}
resource "aws_ecr_lifecycle_policy" "service" {
  for_each   = local.services
  repository = aws_ecr_repository.service[each.key].name
  policy     = jsonencode({ rules = [{ rulePriority = 1, description = "Expire only untagged layers after seven days", selection = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 7 }, action = { type = "expire" } }] })
}
resource "aws_cloudwatch_log_group" "service" {
  for_each          = local.services
  name              = "/ecs/beacon-bold-staging-${each.key}"
  retention_in_days = 14
}
resource "aws_ecs_cluster" "staging" { name = "beacon-bold-staging" }
resource "aws_ecs_task_definition" "service" {
  for_each                 = local.services
  family                   = "beacon-bold-staging-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution[each.key].arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name         = each.key
    image        = "${aws_ecr_repository.service[each.key].repository_url}:bootstrap"
    essential    = true
    portMappings = each.key == "migrate" ? [] : [{ containerPort = each.value, protocol = "tcp" }]
    environment = concat([
      { name = "APP_ENV", value = "staging" },
      { name = "SERVICE_MODE", value = "live" },
      { name = "PUBLIC_API_URL", value = "https://staging.beaconandbold.com" }
      ], each.key == "migrate" ? [
      { name = "PGHOST", value = aws_db_instance.staging.address },
      { name = "PGPORT", value = "5432" },
      { name = "PGDATABASE", value = "beacon" },
      { name = "PGSSLROOTCERT", value = "/runtime/rds-ca.pem" }
    ] : [{ name = "PORT", value = tostring(each.value) }])
    secrets = concat([for key in local.secret_keys[each.key] : { name = key, valueFrom = "${var.runtime_secret_arn}:${key}::" }], each.key == "migrate" ? [
      { name = "PGUSER", valueFrom = "${aws_db_instance.staging.master_user_secret[0].secret_arn}:username::" },
      { name = "PGPASSWORD", valueFrom = "${aws_db_instance.staging.master_user_secret[0].secret_arn}:password::" }
    ] : [])
    logConfiguration = { logDriver = "awslogs", options = {
      awslogs-group         = aws_cloudwatch_log_group.service[each.key].name
      awslogs-region        = "eu-central-1"
      awslogs-stream-prefix = "ecs"
    } }
  }])
}
resource "aws_ecs_service" "service" {
  for_each        = { for key, port in local.services : key => port if key != "migrate" }
  name            = "beacon-bold-staging-${each.key}"
  cluster         = aws_ecs_cluster.staging.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  # Initial infrastructure starts no application until the migration succeeds.
  desired_count                      = 0
  launch_type                        = "FARGATE"
  platform_version                   = "1.4.0"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.service[each.key].arn
    container_name   = each.key
    container_port   = each.value
  }
  depends_on = [aws_lb_listener.https]
  lifecycle { ignore_changes = [task_definition, desired_count] }
}
