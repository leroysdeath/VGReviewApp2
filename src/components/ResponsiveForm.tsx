import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, Star } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal' | 'search';
  pattern?: string;
  maxLength?: number;
  minLength?: number;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  autoComplete,
  inputMode,
  pattern,
  maxLength,
  minLength,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-game-red ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          pattern={pattern}
          maxLength={maxLength}
          minLength={minLength}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 transition-all duration-200 touch-target ${
            error
              ? 'border-game-red focus:border-game-red focus:ring-2 focus:ring-game-red/20'
              : isFocused
              ? 'border-game-purple focus:border-game-purple focus:ring-2 focus:ring-game-purple/20'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        />
        
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors touch-target"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
        
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <X className="h-5 w-5 text-game-red" />
          </div>
        )}
        
        {!error && value && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Check className="h-5 w-5 text-game-green" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-game-red flex items-center space-x-1">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-sm text-gray-400">{helpText}</p>
      )}
    </div>
  );
};

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  rows = 4,
  maxLength,
  showCharCount = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-game-red ml-1">*</span>}
      </label>
      
      <div className="relative">
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          maxLength={maxLength}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 transition-all duration-200 resize-none ${
            error
              ? 'border-game-red focus:border-game-red focus:ring-2 focus:ring-game-red/20'
              : isFocused
              ? 'border-game-purple focus:border-game-purple focus:ring-2 focus:ring-game-purple/20'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        />
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          {error && (
            <p className="text-sm text-game-red flex items-center space-x-1">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </p>
          )}
          
          {helpText && !error && (
            <p className="text-sm text-gray-400">{helpText}</p>
          )}
        </div>
        
        {showCharCount && maxLength && (
          <p className={`text-sm ${
            value.length > maxLength * 0.9 ? 'text-game-orange' : 'text-gray-400'
          }`}>
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};

interface StarRatingFieldProps {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  error?: string;
  maxRating?: number;
  allowHalf?: boolean;
}

const StarRatingField: React.FC<StarRatingFieldProps> = ({
  label,
  name,
  value,
  onChange,
  required = false,
  error,
  maxRating = 10,
  allowHalf = true,
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const handleStarClick = (rating: number) => {
    onChange(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoverValue(rating);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      const isFilled = (hoverValue || value) >= i;
      const isHalf = allowHalf && (hoverValue || value) >= i - 0.5 && (hoverValue || value) < i;
      
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => handleStarClick(i)}
          onMouseEnter={() => handleStarHover(i)}
          onMouseLeave={() => setHoverValue(0)}
          className="touch-target p-1 transition-transform hover:scale-110"
          aria-label={`Rate ${i} stars`}
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              isFilled
                ? 'text-yellow-400 fill-current'
                : isHalf
                ? 'text-yellow-400 fill-current opacity-50'
                : 'text-gray-600 hover:text-yellow-400'
            }`}
          />
        </button>
      );
    }
    return stars;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-game-red ml-1">*</span>}
      </label>
      
      <div className="flex items-center space-x-1">
        {renderStars()}
        {value > 0 && (
          <span className="ml-3 text-lg font-semibold text-white">
            {value.toFixed(1)}
          </span>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-game-red flex items-center space-x-1">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

// Example Review Form Component
export const ReviewForm: React.FC = () => {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    review: '',
    platform: '',
    completed: false,
    recommend: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (formData.rating === 0) {
      newErrors.rating = 'Please provide a rating';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.review.trim()) {
      newErrors.review = 'Review content is required';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // Submit form
      console.log('Submitting review:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Write a Review</h2>
      
      <StarRatingField
        label="Your Rating"
        name="rating"
        value={formData.rating}
        onChange={(value) => setFormData(prev => ({ ...prev, rating: value }))}
        required
        error={errors.rating}
      />
      
      <FormField
        label="Review Title"
        name="title"
        value={formData.title}
        onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
        placeholder="Summarize your experience..."
        required
        error={errors.title}
        maxLength={100}
      />
      
      <TextAreaField
        label="Your Review"
        name="review"
        value={formData.review}
        onChange={(value) => setFormData(prev => ({ ...prev, review: value }))}
        placeholder="Share your detailed thoughts about this game..."
        required
        error={errors.review}
        rows={6}
        maxLength={2000}
        showCharCount
        helpText="Be specific about what you liked or disliked"
      />
      
      <FormField
        label="Platform Played"
        name="platform"
        value={formData.platform}
        onChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
        placeholder="e.g., PlayStation 5, PC, Xbox Series X"
        helpText="Optional: Let others know which platform you played on"
      />
      
      <div className="flex flex-col sm:flex-row gap-4">
        <label className="flex items-center space-x-3 touch-target">
          <input
            type="checkbox"
            checked={formData.completed}
            onChange={(e) => setFormData(prev => ({ ...prev, completed: e.target.checked }))}
            className="w-5 h-5 text-game-purple bg-gray-800 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
          />
          <span className="text-gray-300">I completed this game</span>
        </label>
        
        <label className="flex items-center space-x-3 touch-target">
          <input
            type="checkbox"
            checked={formData.recommend}
            onChange={(e) => setFormData(prev => ({ ...prev, recommend: e.target.checked }))}
            className="w-5 h-5 text-game-green bg-gray-800 border-gray-600 rounded focus:ring-game-green focus:ring-2"
          />
          <span className="text-gray-300">I recommend this game</span>
        </label>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-game-purple hover:bg-game-purple/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 touch-target"
        >
          {isSubmitting ? 'Publishing...' : 'Publish Review'}
        </button>
        
        <button
          type="button"
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 touch-target"
        >
          Save Draft
        </button>
      </div>
    </form>
  );
};

export { FormField, TextAreaField, StarRatingField };