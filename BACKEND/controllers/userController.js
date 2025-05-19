const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { validateEmail, validatePassword } = require('../utils/validation');
const config = require('../config/config');

// Register a new user
exports.registerUser = async (req, res) => {
  console.log('Register endpoint accessed');
  console.log('Request body:', req.body);

  try {
    const { first_name, last_name, email, phone_number, address, password } = req.body;

    // Basic validation
    if (!first_name || !last_name || !email || !phone_number || !address || !password) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.log('Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (!validatePassword(password)) {
      console.log('Validation failed: Password too short');
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error checking email:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }

      if (results.length > 0) {
        console.log('Email already in use');
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Check if phone number already exists
      db.query('SELECT * FROM users WHERE phone_number = ?', [phone_number], async (err, results) => {
        if (err) {
          console.error('Database error checking phone number:', err);
          return res.status(500).json({ message: 'Server error', error: err.message });
        }

        if (results.length > 0) {
          console.log('Phone number already in use');
          return res.status(400).json({ message: 'Phone number already in use' });
        }

        try {
          // Hash the password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          // Insert new user into database
          const newUser = {
            first_name,
            last_name,
            email,
            phone_number,
            address,
            password: hashedPassword
          };

          console.log('Attempting to insert user into database');
          db.query('INSERT INTO users SET ?', newUser, (err, result) => {
            if (err) {
              console.error('Error registering user:', err);
              return res.status(500).json({ 
                message: 'Error registering user', 
                error: err.message 
              });
            }

            console.log('User registered successfully with ID:', result.insertId);            // Generate JWT token
            const token = jwt.sign(
              { id: result.insertId, user_id: result.insertId, email },
              process.env.JWT_SECRET,
              { expiresIn: '1h' }
            );

            res.status(201).json({
              message: 'User registered successfully',
              user_id: result.insertId,
              token
            });
          });
        } catch (hashError) {
          console.error('Error hashing password:', hashError);
          return res.status(500).json({ 
            message: 'Error processing password', 
            error: hashError.message 
          });
        }
      });
    });
  } catch (error) {
    console.error('Server error in registerUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  console.log('Login endpoint accessed');
  console.log('Login request body:', req.body);

  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      console.log('Validation failed: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.log('Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }

      if (results.length === 0) {
        console.log('User not found for email:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = results[0];

      try {
        // Compare password with stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          console.log('Invalid password for user:', email);
          return res.status(401).json({ message: 'Invalid credentials' });
        }        // Generate JWT token
        const token = jwt.sign(
          { id: user.user_id, user_id: user.user_id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        console.log('User logged in successfully:', email);

        // Send response with token and user info (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        
        res.status(200).json({
          message: 'Login successful',
          token,
          user: userWithoutPassword
        });
      } catch (compareError) {
        console.error('Error comparing passwords:', compareError);
        return res.status(500).json({ 
          message: 'Error processing login', 
          error: compareError.message 
        });
      }
    });
  } catch (error) {
    console.error('Server error in loginUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user's profile
exports.getCurrentUserProfile = async (req, res) => {
  console.log('Get current user profile endpoint accessed');
  console.log('User ID from token:', req.user.id);

  try {
    // Query the database to get user information
    db.query('SELECT * FROM users WHERE user_id = ?', [req.user.id], async (err, results) => {
      if (err) {
        console.error('Database error fetching user profile:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }

      if (results.length === 0) {
        console.log('User not found with ID:', req.user.id);
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove sensitive information before sending the response
      const user = results[0];
      const { password, ...userWithoutPassword } = user;
      
      // Send the user data
      res.status(200).json(userWithoutPassword);
    });
  } catch (error) {
    console.error('Server error in getCurrentUserProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user profile by ID (mainly for admin use)
exports.getUserProfile = async (req, res) => {
  console.log('Get user profile by ID endpoint accessed');
  console.log('Requested user ID:', req.params.id);

  try {
    // Check if the requesting user is authorized to see the profile
    // Allow users to view their own profile or admins to view any profile
    const isOwnProfile = req.user.id === parseInt(req.params.id);
    
    if (!isOwnProfile) {
      // Check if the user is an admin
      db.query('SELECT is_admin FROM users WHERE user_id = ?', [req.user.id], async (err, results) => {
        if (err || results.length === 0 || !results[0].is_admin) {
          return res.status(403).json({ message: 'Not authorized to view this profile' });
        }
      });
    }

    // Query the database to get user information
    db.query('SELECT * FROM users WHERE user_id = ?', [req.params.id], async (err, results) => {
      if (err) {
        console.error('Database error fetching user profile:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }

      if (results.length === 0) {
        console.log('User not found with ID:', req.params.id);
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove sensitive information before sending the response
      const user = results[0];
      const { password, ...userWithoutPassword } = user;
      
      // Send the user data
      res.status(200).json(userWithoutPassword);
    });
  } catch (error) {
    console.error('Server error in getUserProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  console.log('Update user profile endpoint accessed');
  console.log('User ID from token:', req.user.id);
  console.log('Request body:', req.body);

  try {
    const { first_name, last_name, email, phone_number, address } = req.body;

    // Basic validation
    if (!first_name || !last_name || !email || !phone_number || !address) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.log('Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if the email is already in use by another user
    db.query('SELECT * FROM users WHERE email = ? AND user_id != ?', 
      [email, req.user.id], async (err, results) => {
      if (err) {
        console.error('Database error checking email:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }

      if (results.length > 0) {
        console.log('Email already in use by another user');
        return res.status(400).json({ message: 'Email already in use by another user' });
      }

      // Check if the phone number is already in use by another user
      db.query('SELECT * FROM users WHERE phone_number = ? AND user_id != ?', 
        [phone_number, req.user.id], async (err, results) => {
        if (err) {
          console.error('Database error checking phone number:', err);
          return res.status(500).json({ message: 'Server error', error: err.message });
        }

        if (results.length > 0) {
          console.log('Phone number already in use by another user');
          return res.status(400).json({ message: 'Phone number already in use by another user' });
        }

        // Update the user profile in the database
        const updatedUserData = {
          first_name,
          last_name,
          email,
          phone_number,
          address
        };

        db.query('UPDATE users SET ? WHERE user_id = ?', 
          [updatedUserData, req.user.id], async (err, result) => {
          if (err) {
            console.error('Error updating user profile:', err);
            return res.status(500).json({ 
              message: 'Error updating user profile', 
              error: err.message 
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
          }

          // Fetch the updated user data to return
          db.query('SELECT * FROM users WHERE user_id = ?', [req.user.id], async (err, results) => {
            if (err || results.length === 0) {
              return res.status(500).json({ message: 'Error retrieving updated profile' });
            }

            // Remove password from the response
            const updatedUser = results[0];
            const { password, ...userWithoutPassword } = updatedUser;

            console.log('User profile updated successfully');
            res.json({
              message: 'Profile updated successfully',
              user: userWithoutPassword
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Server error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update login function if present
exports.login = (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  // Find user by email
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];

    // We'll use direct comparison for the demo, but should use bcrypt in production
    const isMatch = password === user.password;

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token payload
    const payload = {
      user: {
        id: user.user_id,
        email: user.email,
        role: 'user'
      }
    };

    // Sign token
    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiration },
      (err, token) => {
        if (err) throw err;
        
        // Return token and user info (excluding sensitive data)
        const { password, ...userInfo } = user;
        
        res.json({
          token,
          user: userInfo,
          message: 'Login successful'
        });
      }
    );
  });
};
