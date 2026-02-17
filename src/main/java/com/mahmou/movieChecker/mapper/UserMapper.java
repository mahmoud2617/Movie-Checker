package com.mahmou.movieChecker.mapper;

import com.mahmou.movieChecker.dto.UserDto;
import com.mahmou.movieChecker.entity.User;
import com.mahmou.movieChecker.security.CustomUserDetails;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
}
