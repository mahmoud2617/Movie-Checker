package com.mahmoud.movieChecker.mapper;

import com.mahmoud.movieChecker.dto.UserDto;
import com.mahmoud.movieChecker.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
}
