data "aws_availability_zones" "available" { state = "available" }

resource "aws_vpc" "staging" {
  cidr_block           = "10.70.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}
resource "aws_internet_gateway" "staging" { vpc_id = aws_vpc.staging.id }
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.staging.id
  cidr_block        = cidrsubnet(aws_vpc.staging.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
resource "aws_subnet" "data" {
  count             = 2
  vpc_id            = aws_vpc.staging.id
  cidr_block        = cidrsubnet(aws_vpc.staging.cidr_block, 8, 10 + count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.staging.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.staging.id
  }
}
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
resource "aws_security_group" "alb" {
  name   = "beacon-bold-staging-alb"
  vpc_id = aws_vpc.staging.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port       = 3000
    to_port         = 3002
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }
}
resource "aws_security_group" "tasks" {
  name   = "beacon-bold-staging-tasks"
  vpc_id = aws_vpc.staging.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_vpc_security_group_ingress_rule" "tasks" {
  security_group_id            = aws_security_group.tasks.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3000
  to_port                      = 3002
  ip_protocol                  = "tcp"
}
resource "aws_security_group" "database" {
  name   = "beacon-bold-staging-database"
  vpc_id = aws_vpc.staging.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }
}
resource "aws_security_group" "redis" {
  name   = "beacon-bold-staging-redis"
  vpc_id = aws_vpc.staging.id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }
}
