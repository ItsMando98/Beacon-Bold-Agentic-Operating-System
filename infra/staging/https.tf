data "aws_route53_zone" "staging" {
  zone_id = var.zone_id
}
resource "aws_lb" "staging" {
  name                       = "beacon-bold-staging"
  load_balancer_type         = "application"
  internal                   = false
  subnets                    = aws_subnet.public[*].id
  security_groups            = [aws_security_group.alb.id]
  drop_invalid_header_fields = true
}
resource "aws_lb_target_group" "service" {
  for_each    = { for key, port in local.services : key => port if key != "migrate" }
  name        = "beacon-bold-staging-${each.key}"
  port        = each.value
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.staging.id
  health_check {
    path    = each.key == "api" ? "/health" : "/"
    matcher = "200"
  }
}
resource "aws_acm_certificate" "staging" {
  domain_name               = "staging.beaconandbold.com"
  subject_alternative_names = ["app.staging.beaconandbold.com", "web.staging.beaconandbold.com"]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
}
resource "aws_route53_record" "validation" {
  for_each = toset(["staging.beaconandbold.com", "app.staging.beaconandbold.com", "web.staging.beaconandbold.com"])
  zone_id  = var.zone_id
  name     = one([for option in aws_acm_certificate.staging.domain_validation_options : option.resource_record_name if option.domain_name == each.key])
  type     = one([for option in aws_acm_certificate.staging.domain_validation_options : option.resource_record_type if option.domain_name == each.key])
  records  = [one([for option in aws_acm_certificate.staging.domain_validation_options : option.resource_record_value if option.domain_name == each.key])]
  ttl      = 300
  lifecycle {
    precondition {
      condition     = trimsuffix(data.aws_route53_zone.staging.name, ".") == "staging.beaconandbold.com"
      error_message = "Only the delegated staging zone may be modified."
    }
  }
}
resource "aws_acm_certificate_validation" "staging" {
  certificate_arn         = aws_acm_certificate.staging.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.staging.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.staging.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.staging.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["api"].arn
  }
}
resource "aws_lb_listener_rule" "frontend" {
  for_each     = toset(["app", "web"])
  listener_arn = aws_lb_listener.https.arn
  priority     = each.key == "app" ? 10 : 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service[each.key].arn
  }
  condition {
    host_header {
      values = ["${each.key}.staging.beaconandbold.com"]
    }
  }
}
resource "aws_route53_record" "service" {
  for_each = toset(["staging.beaconandbold.com", "app.staging.beaconandbold.com", "web.staging.beaconandbold.com"])
  zone_id  = var.zone_id
  name     = each.key
  type     = "A"
  lifecycle {
    precondition {
      condition     = trimsuffix(data.aws_route53_zone.staging.name, ".") == "staging.beaconandbold.com"
      error_message = "Only the delegated staging zone may be modified."
    }
  }
  alias {
    name                   = aws_lb.staging.dns_name
    zone_id                = aws_lb.staging.zone_id
    evaluate_target_health = true
  }
}
