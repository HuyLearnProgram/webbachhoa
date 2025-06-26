package com.app.webnongsan.controller;

import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.user.CreateUserDTO;
import com.app.webnongsan.domain.response.user.UpdateUserDTO;
import com.app.webnongsan.domain.response.user.UserDTO;
import com.app.webnongsan.service.UserService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("users")
    @ApiMessage("Create new user")
    public ResponseEntity<CreateUserDTO> createNewUser(@Valid @RequestBody User user) throws ResourceInvalidException {
        if (this.userService.isExistedEmail(user.getEmail())){
            throw new ResourceInvalidException("Email " + user.getEmail() + " đã tồn tại");
        }
        User newUser = this.userService.create(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(this.userService.convertToCreateDTO(newUser));
    }

    @DeleteMapping("users/{id}")
    @ApiMessage("Delete user")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") long id) throws ResourceInvalidException {
        boolean check = this.userService.isExistedId(id);
        if (!check){
            throw new ResourceInvalidException("Người dùng với id " + id + " không tồn tại");
        }
        this.userService.delete(id);
        return ResponseEntity.ok(null);
    }

    @GetMapping("users/{id}")
    @ApiMessage("Get user by id")
    public ResponseEntity<UserDTO> getUser(@PathVariable("id") long id) throws ResourceInvalidException {
        User currentUser = this.userService.getUserById(id);
        if (currentUser == null){
            throw new ResourceInvalidException("Người dùng với id " + id + " không tồn tại");
        }
        return ResponseEntity.status(HttpStatus.OK).body(this.userService.convertToUserDTO(currentUser));
    }

    @GetMapping("users")
    @ApiMessage("Fetch users")
    public ResponseEntity<PaginationDTO> fetchAllUser(@Filter Specification<User> spec, Pageable pageable) {
        return ResponseEntity.ok(this.userService.fetchAllUser(spec, pageable));
    }

    @PutMapping("users")
    @ApiMessage("Update user")
    public ResponseEntity<UpdateUserDTO> updateUser(@RequestBody User user) throws ResourceInvalidException {
        User updatedUser = this.userService.update(user);
        if (updatedUser == null){
            throw new ResourceInvalidException("Người dùng với id " + user.getId() + " không tồn tại");
        }
        return ResponseEntity.ok(this.userService.convertToUpdateUserDTO(updatedUser));
    }

}
