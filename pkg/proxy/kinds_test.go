package proxy

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_toAbbreviation(t *testing.T) {

	assert.Equal(t, toAbbreviation("ABC"), "Ab", "they should be equal")
	assert.Equal(t, toAbbreviation("AB"), "Ab", "they should be equal")
	assert.Equal(t, toAbbreviation("AligatorBanana"), "Ab", "they should be equal")
	assert.Equal(t, toAbbreviation("ab"), "Ab", "they should be equal")
	assert.Equal(t, toAbbreviation("a"), "A", "they should be equal")
	assert.Equal(t, toAbbreviation("A"), "A", "they should be equal")
}
