import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is Game Vault?",
    answer: "Game Vault is your personal hub for tracking, reviewing, and discovering video games. Log the games you've played, share your thoughts through reviews, and connect with a community of fellow gamers."
  },
  {
    question: "Who is Game Vault for?",
    answer: "Whether you're a casual gamer, a console veteran, or a PC completionist—Game Vault is built for everyone who enjoys video games and want's to share their thoughts and experiences with the gaming community"
  },
  {
    question: "Do I need an account to use Game Vault?",
    answer: "Yes, creating an account is free and gives you access to all features, including logging games, writing reviews, and interacting with the community."
  },
  {
    question: "How do I log a game I've played?",
    answer: "Once you're logged in, just search for a game using the search bar, go to its page, and click \"Write Review\" to share your thoughts and experience while playing the game and then click \"Mark as Finished\" to Log it in your activity. You can choose your play status (e.g., Playing, Completed, Wishlist), add notes, and even rate it."
  },
  {
    question: "Can I write and share reviews?",
    answer: "Absolutely. After logging a game, you can submit a detailed review and rating. Your reviews will appear on the game's page and your profile, helping others discover great titles."
  },
  {
    question: "How do I discover new games on Game Vault?",
    answer: "Use the \"Explore Games\" button on the home page to search for trending titles, top-rated games, and user recommendations. You can also browse by platform, genre, or release year."
  },
  {
    question: "Can I update or delete my logs and reviews?",
    answer: "Yes. Visit your profile, find the log or review you'd like to change, and click \"Edit\" or \"Delete\" to make updates at any time. (I still think we should be able to delete game reviews or logs)"
  },
  {
    question: "Can I connect with other users? How do I follow someone?",
    answer: "Yes! You can follow other players to keep up with their game activity and reviews, and engage with the community through comments and likes. Once you are on a user's profile that you would like to follow(Still needs to be able to function this way)"
  },
  {
    question: "Is Game Vault available as a mobile app?",
    answer: "Not yet—but the website is fully responsive and works smoothly on both desktop and mobile browsers."
  },
  {
    question: "How can I report a bug or suggest a new feature?",
    answer: "We'd love your feedback! Use the \"Contact\" link in the footer or visit the Help Center to report issues, suggest features, or ask questions."
  },
  {
    question: "How do I choose my Top 5?",
    answer: "Once you have a profile created while logged in, click the \"Top 5\" option. Click on any of the 5 spaces to chose from games you've already reviewed to be chosen as your own personal favorites. Once chosen, feel free to move them around to your liking with the \"Edit\" button. Remember, you can only choose from games you've already reviewed and logged."
  }
];

export const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">
            Find answers to common questions about Game Vault
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openItems.includes(index);
            
            return (
              <div 
                key={index} 
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white pr-4">
                    {item.question}
                  </h3>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {isOpen && (
                  <div className="px-6 pb-4">
                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-gray-300 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">
            Still have questions?
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
};