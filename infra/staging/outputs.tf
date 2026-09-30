output "deploy_role_arn" { value = aws_iam_role.github.arn }
output "cluster" { value = aws_ecs_cluster.staging.name }
output "task_subnets" { value = aws_subnet.public[*].id }
output "task_security_group" { value = aws_security_group.tasks.id }
output "database_host" { value = aws_db_instance.staging.address }
output "redis_host" { value = aws_elasticache_replication_group.staging.primary_endpoint_address }
output "migration_task_definition" { value = aws_ecs_task_definition.service["migrate"].arn }
