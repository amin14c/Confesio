import * as Yup from 'yup';

// Validation schema for messages
export const messageSchema = Yup.string()  
  .required('Message is required')  
  .min(1, 'Message cannot be empty')  
  .max(500, 'Message cannot exceed 500 characters');

// Validation schema for room IDs
export const roomIdSchema = Yup.string()  
  .required('Room ID is required')  
  .matches(/^[a-zA-Z0-9]+$/, 'Room ID must be alphanumeric')  
  .min(3, 'Room ID must be at least 3 characters long')  
  .max(20, 'Room ID cannot exceed 20 characters');

// Validation schema for user data
export const userDataSchema = Yup.object().shape({  
  username: Yup.string()  
    .required('Username is required')  
    .min(3, 'Username must be at least 3 characters long')  
    .max(20, 'Username cannot exceed 20 characters'),  
  email: Yup.string()  
    .required('Email is required')  
    .email('Email is not valid'),  
  password: Yup.string()  
    .required('Password is required')  
    .min(8, 'Password must be at least 8 characters long')  
    .matches(/[a-zA-Z]/, 'Password must contain at least one letter')  
    .matches(/[0-9]/, 'Password must contain at least one number'),
});
