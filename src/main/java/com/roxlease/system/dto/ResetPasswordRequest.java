package com.roxlease.system.dto;
import lombok.Data;
@Data public class ResetPasswordRequest { private String token; private String newPassword; }