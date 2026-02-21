package com.mahmou.movieChecker.mapper;

import com.mahmou.movieChecker.dto.UserDto;
import com.mahmou.movieChecker.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
}
