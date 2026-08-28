import User from '../models/User.js';

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, sort } = req.query;

    const query = { role: 'user' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'date_asc') sortObj = { createdAt: 1 };
    if (sort === 'name_asc') sortObj = { name: 1 };
    if (sort === 'name_desc') sortObj = { name: -1 };

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: true,
      count: users.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to fetch users',
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to fetch user',
    });
  }
};
