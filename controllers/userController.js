import User from '../models/User.js';
import Order from '../models/Order.js';

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
        { phone: { $regex: search, $options: 'i' } },
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
      .limit(limit)
      .lean();

    // Fetch user order statistics for total spent and order counts
    const userIds = users.map((u) => u._id);
    const userOrders = await Order.find({ user: { $in: userIds } })
      .select('user total orderStatus')
      .lean();

    const statsMap = {};
    userOrders.forEach((ord) => {
      const uId = ord.user?.toString();
      if (uId) {
        if (!statsMap[uId]) {
          statsMap[uId] = { totalSpent: 0, orderCount: 0 };
        }
        statsMap[uId].orderCount += 1;
        if (ord.orderStatus !== 'cancelled') {
          statsMap[uId].totalSpent += Number(ord.total || 0);
        }
      }
    });

    const enrichedUsers = users.map((u) => {
      const stats = statsMap[u._id.toString()] || { totalSpent: 0, orderCount: 0 };
      return {
        ...u,
        totalSpent: stats.totalSpent,
        orderCount: stats.orderCount,
      };
    });

    res.status(200).json({
      status: true,
      count: enrichedUsers.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: enrichedUsers,
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
    const user = await User.findById(req.params.id)
      .populate({
        path: 'wishlist',
        select: 'name price images sku slug category isStockAvailable',
      })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    // Fetch orders placed by this user
    const userOrders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();

    const totalSpent = userOrders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const fullUserData = {
      ...user,
      orders: userOrders,
      orderCount: userOrders.length,
      totalSpent,
    };

    res.status(200).json({
      status: true,
      data: fullUserData,
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
export const getUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: true,
      data: user.addresses || [],
    });
  } catch (error) {
    console.error('Error fetching user addresses:', error.message);
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to fetch addresses',
    });
  }
};

export const addUserAddress = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      street,
      apartment,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    if (!fullName || !phone || !street || !city || !state || !postalCode) {
      return res.status(400).json({
        status: false,
        message: 'Please provide all required address fields (Name, Phone, Street, City, State, PIN Code)',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    const shouldBeDefault = isDefault || !user.addresses || user.addresses.length === 0;

    if (shouldBeDefault && user.addresses && user.addresses.length > 0) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      apartment: (apartment || '').trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: (country || 'India').trim(),
      addressType: addressType || 'home',
      isDefault: shouldBeDefault,
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      status: true,
      message: 'Address added successfully',
      data: user.addresses,
    });
  } catch (error) {
    console.error('Error adding user address:', error.message);
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to add address',
    });
  }
};

export const updateUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const {
      fullName,
      phone,
      street,
      apartment,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        status: false,
        message: 'Address not found',
      });
    }

    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = addr._id.toString() === addressId;
      });
    }

    if (fullName !== undefined) address.fullName = fullName.trim();
    if (phone !== undefined) address.phone = phone.trim();
    if (street !== undefined) address.street = street.trim();
    if (apartment !== undefined) address.apartment = apartment.trim();
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state.trim();
    if (postalCode !== undefined) address.postalCode = postalCode.trim();
    if (country !== undefined) address.country = country.trim();
    if (addressType !== undefined) address.addressType = addressType;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();

    res.status(200).json({
      status: true,
      message: 'Address updated successfully',
      data: user.addresses,
    });
  } catch (error) {
    console.error('Error updating user address:', error.message);
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to update address',
    });
  }
};

// Delete an address
export const deleteUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    const addressToDelete = user.addresses.id(addressId);
    if (!addressToDelete) {
      return res.status(404).json({
        status: false,
        message: 'Address not found',
      });
    }

    const wasDefault = addressToDelete.isDefault;
    user.addresses.pull({ _id: addressId });

    // If default was deleted and remaining addresses exist, set first one as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      status: true,
      message: 'Address deleted successfully',
      data: user.addresses,
    });
  } catch (error) {
    console.error('Error deleting user address:', error.message);
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to delete address',
    });
  }
};

// Set an address as default
export const setDefaultUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    const targetAddress = user.addresses.id(addressId);
    if (!targetAddress) {
      return res.status(404).json({
        status: false,
        message: 'Address not found',
      });
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    await user.save();

    res.status(200).json({
      status: true,
      message: 'Default address updated successfully',
      data: user.addresses,
    });
  } catch (error) {
    console.error('Error setting default address:', error.message);
    res.status(500).json({
      status: false,
      message: 'Server Error: Failed to set default address',
    });
  }
};
